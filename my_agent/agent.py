import asyncio

from google.adk.agents.llm_agent import Agent
from google.adk.models import Gemini
from google.adk.tools import google_search, url_context
from google.adk.tools.agent_tool import AgentTool
from google.genai import types

from . import schemas
from .tools import (
    get_analyst_estimates,
    get_balance_sheet,
    get_cash_flow,
    get_income_statement,
    get_technical_snapshot,
    get_treasury_yields,
    get_valuation_metrics,
)


def _model() -> Gemini:
    return Gemini(
        model='gemini-2.5-flash',
        retry_options=types.HttpRetryOptions(
            attempts=9,
            initial_delay=1,
            max_delay=60,
        ),
    )


def _search_agent() -> Agent:
    return Agent(
        model=_model(),
        name='search_agent',
        mode='single_turn',
        disallow_transfer_to_parent=True,
        description=(
            'Searches the web to answer a specific question, e.g. resolving '
            'a company name to its stock ticker or finding narrative '
            "context (news, disclosures) that structured data tools don't "
            'cover.'
        ),
        instruction=(
            'You will receive a specific question or lookup request. Use '
            'google_search to answer it concisely and factually, citing '
            'what you found. Always end your turn with written text. If '
            'the search comes back with nothing usable, reply with exactly '
            '"No reliable information found." - returning an empty '
            'response is never correct, because the agent that called '
            'you cannot tell an empty answer apart from a failure. Do '
            'not address the user directly and do not ask questions.'
        ),
        # url_context is deliberately absent: pairing it with google_search
        # measurably raised the rate of empty model turns (2/3 vs 1/3 on the
        # same query), and search grounding already returns page content.
        # source_agent still holds it, since listing sources needs the URLs.
        tools=[google_search],
    )

_URL_LOOKUP_CAP = (
    'url_context can open at most 20 URLs in a single call, and it errors '
    'out entirely if you exceed that - so never pass more than about 10 '
    'URLs to one url_context call. If you have more candidate pages than '
    'that, pick only the most relevant/authoritative ones rather than '
    'trying to open them all, or split the lookups across multiple '
    'url_context calls.'
)

_SUBAGENT_ERROR_PREFIX = 'Error running sub-agent:'

# Failures worth a second attempt: transient capacity/transport problems that a
# fresh call can plausibly clear. Everything else (a bad tool/schema
# combination, a malformed request, a missing permission) will fail again
# identically, so retrying it only doubles the latency and token spend.
_TRANSIENT_ERROR_MARKERS = (
    'resource_exhausted', 'rate limit', 'quota', 'deadline', 'timeout',
    'timed out', 'unavailable', 'internal error', 'overloaded',
    ' 429', ' 500', ' 502', ' 503', ' 504',
)

# How many times to re-run a sub-agent that came back with nothing at all.
_EMPTY_RESULT_RETRIES = 4


def _is_transient(error_text: str) -> bool:
    """Whether a sub-agent failure looks worth retrying.

    Deliberately positive-matching: an unrecognised failure is treated as
    deterministic. `_model()` already sets HttpRetryOptions(attempts=9) with
    backoff, so transport-level flakiness has been retried nine times before
    it ever reaches here - which leaves re-running the whole sub-agent
    valuable only for the narrow set of failures named above.
    """
    lowered = error_text.lower()
    return any(marker in lowered for marker in _TRANSIENT_ERROR_MARKERS)


def _is_blank(response) -> bool:
    return response is None or (isinstance(response, str) and not response.strip())


async def _recover_subagent_result(*, tool, args, tool_context, tool_response):
    """Retries a sub-agent that failed or returned nothing, and makes an
    unrecoverable one explicit rather than letting the caller continue on
    silence.

    Two different failures arrive here, and only one of them looks like a
    failure. A sub-agent that raised comes back as a string starting with
    `_SUBAGENT_ERROR_PREFIX`. A sub-agent whose model finished with
    `finish_reason=STOP` and no content parts comes back as an empty string,
    which is indistinguishable from a legitimately empty answer - so nothing
    downstream notices.

    The empty case is the common one for search_agent. Gemini's built-in
    google_search intermittently returns no content at all (measured at 4 of
    5 runs on a recency-heavy query), and nothing else retries it:
    HttpRetryOptions covers transport errors, and a 200 with an empty body is
    not one. Retrying works because the failure is genuinely intermittent -
    the identical query succeeds on a re-run.

    Only agent-tools are handled; ordinary data tools return dicts and are
    left alone, as is the ADK-injected set_model_response tool.
    """
    if not isinstance(tool, AgentTool):
        return None

    if isinstance(tool_response, str) and tool_response.startswith(
        _SUBAGENT_ERROR_PREFIX
    ):
        if not _is_transient(tool_response):
            return {
                'result': (
                    f'{tool.name} failed and was not retried because the '
                    f'failure is deterministic, not transient '
                    f'({tool_response}). This needs a code fix, so re-calling '
                    'it now will fail the same way. Do not fabricate what '
                    'this step would have produced - tell the user this step '
                    'failed instead of quietly continuing without it.'
                )
            }
        retry = await tool.run_async(args=args, tool_context=tool_context)
        if not _is_blank(retry) and not (
            isinstance(retry, str) and retry.startswith(_SUBAGENT_ERROR_PREFIX)
        ):
            return {'result': retry}
        return {
            'result': (
                f'{tool.name} failed and the retry also failed ({retry}). Do '
                'not fabricate what this step would have produced - tell the '
                'user this step failed instead of quietly continuing '
                'without it.'
            )
        }

    if not _is_blank(tool_response):
        return None

    for attempt in range(_EMPTY_RESULT_RETRIES):
        await asyncio.sleep(0.5 * (attempt + 1))
        # Vary the request each time. An identical request can reproduce an
        # identical empty turn, so a bare re-send is a weaker retry than it
        # looks; nudging the wording also re-states that text is required.
        retry_args = dict(args)
        request = retry_args.get('request')
        if isinstance(request, str) and request.strip():
            retry_args['request'] = (
                f'{request}\n\n(Attempt {attempt + 2}: the previous attempt '
                'came back empty. Answer in plain written text. If you find '
                'nothing usable, write "No reliable information found." - do '
                'not return an empty response.)'
            )
        retry = await tool.run_async(args=retry_args, tool_context=tool_context)
        if isinstance(retry, str) and retry.startswith(_SUBAGENT_ERROR_PREFIX):
            continue
        if not _is_blank(retry):
            return {'result': retry}

    return {
        'result': (
            f'{tool.name} returned no content after '
            f'{_EMPTY_RESULT_RETRIES + 1} attempts. Treat this step as '
            'unavailable: do not invent what it would have said, and note '
            'the gap instead of filling it from your own knowledge.'
        )
    }


_DATA_TOOL_CAVEAT = (
    'You have real data tools (backed by SEC filings, Yahoo Finance, and '
    'the Federal Reserve) below, plus search_agent for open-web lookups. '
    "Figure out the company's stock ticker from the request (call "
    'search_agent if it is not given), then prefer the data tools for any '
    'figure they can supply - call search_agent only to resolve the ticker '
    'or fill a gap the data tools cannot cover. Note the as-of date/period '
    'a tool returns. If a tool returns an "error" or a ticker cannot be '
    'resolved, say so plainly rather than inventing a number.'
)


def _note_instruction(agent_name: str) -> str:
    """Instructs an analyst agent to reply with a structured AnalystNote
    (its output_schema) instead of free text, so vp_agent can read and
    reconcile it out of session state rather than trusting prose.
    """
    return (
        f" Return an AnalystNote: agent='{agent_name}', your directional "
        "stance (or 'not_applicable' if this analysis has no bullish/"
        'bearish angle), a confidence from 0 to 1, a concise summary, the '
        'key_points/figures backing it, any data_gaps you could not '
        'verify, and as_of for the period/date the data covers.'
    )

balance_sheet_agent = Agent(
    model=_model(),
    name='balance_sheet_agent',
    mode='single_turn',
    disallow_transfer_to_parent=True,
    description=(
        'Finds and summarizes balance sheet figures and 10-K disclosures '
        '(assets, liabilities, debt, cash, key risk factors) for a company.'
    ),
    instruction=(
        'You will receive a user request about a company. Call get_balance_sheet, get_income_statement, and '
        'get_cash_flow for its ticker to get real assets, liabilities, debt, '
        'cash position, revenue, and disclosed figures, and call '
        'search_agent for narrative 10-K disclosures (e.g. risk factors) '
        'those tools do not cover. Summarize concisely, citing which '
        'filing/period each figure comes from. ' + _DATA_TOOL_CAVEAT +
        ' Do not address the user directly and do not ask questions.'
        + _note_instruction('balance_sheet_agent')
    ),
    tools=[get_balance_sheet, get_income_statement, get_cash_flow],
    sub_agents=[_search_agent()],
    after_tool_callback=_recover_subagent_result,
    output_schema=schemas.AnalystNote,
    output_key='balance_sheet_note',
)

_VALUATION_PASS_INSTRUCTION = (
    'You will receive a user request about a company. '
    'Call get_cash_flow for real cash-flow inputs, get_valuation_metrics for '
    'current trading multiples and market cap (P/E, forward P/E, EV/EBITDA, '
    'etc.), and get_analyst_estimates for consensus price targets. Call '
    'search_agent to find growth/discount rate assumptions, peer companies, '
    'and comparable historical acquisitions those tools do not cover. Then '
    'work through all three methods: 1) a DCF estimate, 2) comparable '
    'company analysis against similar publicly traded peers, and 3) '
    'precedent transaction analysis against similar past deals.\n\n'
    'Return a ValuationPass. For each method, give value_per_share and/or '
    'enterprise_value along with every assumption behind it in '
    'key_assumptions - discount rate, terminal growth, peer set, deal '
    'multiples - stated explicitly and numerically. A second pass will be '
    'compared against yours, so an assumption you leave implicit cannot be '
    'checked. If a method has no data behind it (precedent transaction '
    'multiples in particular are not covered by any of your data tools), set '
    'unavailable_reason for that method and leave its numbers null instead '
    'of inventing figures. Sanity-check your DCF against the market cap from '
    'get_valuation_metrics: if your implied equity value differs from it by '
    'more than roughly half, your assumptions are more likely wrong than the '
    'market is, so say so in data_gaps rather than reporting the gap as a '
    'finding.\n\n'
    'You are one independent pass. You cannot see any other pass, and you '
    'must not speculate about what another pass concluded or try to match '
    'it. ' + _DATA_TOOL_CAVEAT + ' Do not address the user directly and do '
    'not ask questions.'
)


def _valuation_pass(pass_id: str) -> Agent:
    """Builds one self-contained valuation pass.

    `include_contents='none'` keeps the pass from reading conversation
    history, and each `_SingleTurnAgentTool` call runs its agent on its own
    branch, so the two passes cannot observe each other's tool calls or
    conclusions. Their independence is what makes comparing them a real
    back-check rather than a model agreeing with itself.
    """
    return Agent(
        model=_model(),
        name=f'valuation_pass_{pass_id}',
        mode='single_turn',
        include_contents='none',
        disallow_transfer_to_parent=True,
        description=(
            f'Independent valuation pass {pass_id.upper()}: builds a DCF, '
            'comparable company, and precedent transaction estimate for a '
            'company from scratch.'
        ),
        instruction=(
            f'You are valuation pass "{pass_id}" - set pass_id to '
            f'"{pass_id}". ' + _VALUATION_PASS_INSTRUCTION
        ),
        tools=[get_cash_flow, get_valuation_metrics, get_analyst_estimates],
        sub_agents=[_search_agent()],
        after_tool_callback=_recover_subagent_result,
        output_schema=schemas.ValuationPass,
        output_key=f'valuation_pass_{pass_id}',
    )


valuation_agent = Agent(
    model=_model(),
    name='valuation_agent',
    mode='single_turn',
    disallow_transfer_to_parent=True,
    description=(
        'Values a company twice over, independently, then back-checks the '
        'two runs against each other: a discounted cash flow (DCF) model, '
        'comparable company analysis, and precedent transaction analysis.'
    ),
    instruction=(
        'You coordinate two independent valuations of the same company and '
        'back-check one against the other. A valuation is mostly a function '
        'of its assumptions, so a number that only one pass reaches is not '
        'yet a finding.\n\n'
        '1. Call valuation_pass_a and valuation_pass_b together, in the '
        'same turn, issuing both tool calls in one response so they run '
        'concurrently rather than one after the other. Pass each of them '
        'the same request you received, worded identically.\n'
        '2. Never put one pass\'s figures, assumptions, or conclusions '
        "into the other pass's request - the comparison only means "
        'something if each reached its answer without seeing the other. '
        'Issuing both calls at once is also what guarantees neither can '
        'see the other, so do not call them sequentially.\n'
        '3. Compare the two completed passes:\n\n'
        'valuation_pass_a: {valuation_pass_a?}\n'
        'valuation_pass_b: {valuation_pass_b?}\n\n'
        'Return an AnalystNote for agent=\'valuation_agent\' with '
        'cross_check filled in: both passes\' fair values, divergence_pct '
        '(their absolute difference as a percentage of their mean), what '
        'both passes independently agreed on, where they diverged and which '
        'assumption drove each divergence, and a reconciled_fair_value. Set '
        'reproducible=true only if divergence_pct is under about 15%.\n\n'
        'Let the comparison set your confidence: two passes landing close '
        'together on shared assumptions justify a high confidence, while a '
        'wide divergence means the valuation is assumption-driven and your '
        'confidence should be low and your summary should say so plainly '
        'rather than averaging the two into a single tidy number. Carry any '
        'method both passes marked unavailable, and any figure only one pass '
        'produced, into data_gaps. Do not address the user directly and do '
        'not ask questions.' + _note_instruction('valuation_agent')
    ),
    sub_agents=[_valuation_pass('a'), _valuation_pass('b')],
    after_tool_callback=_recover_subagent_result,
    output_schema=schemas.AnalystNote,
    output_key='valuation_note',
)

technical_agent = Agent(
    model=_model(),
    name='technical_agent',
    mode='single_turn',
    disallow_transfer_to_parent=True,
    description=(
        'Analyzes recent price action, RSI, moving averages, and volume '
        'patterns for a security.'
    ),
    instruction=(
        'You will receive a user request about a security. Call get_technical_snapshot for its ticker to get real '
        'recent price action, RSI, 50/200-day moving averages, and volume '
        'trends; call search_agent only for context those numbers do not '
        'explain (e.g. a recent catalyst). Summarize what the technical '
        'picture suggests concisely. ' + _DATA_TOOL_CAVEAT + ' Do not '
        'address the user directly and do not ask questions.'
        + _note_instruction('technical_agent')
    ),
    tools=[get_technical_snapshot],
    sub_agents=[_search_agent()],
    after_tool_callback=_recover_subagent_result,
    output_schema=schemas.AnalystNote,
    output_key='technical_note',
)

macro_agent = Agent(
    model=_model(),
    name='macro_agent',
    mode='single_turn',
    disallow_transfer_to_parent=True,
    description=(
        'Tracks relevant interest rates and bond yields.'
    ),
    instruction=(
        'You will receive a user request. Call '
        'get_treasury_yields to get the real, current U.S. Treasury yield '
        'curve (short-term rates as a proxy for policy stance, plus the '
        '10-year and other tenors). Call search_agent for non-U.S. central '
        'bank rates or context those yields do not cover. Summarize what '
        'the rates imply concisely. ' + _DATA_TOOL_CAVEAT + ' Do not '
        'address the user directly and do not ask questions.'
        + _note_instruction('macro_agent')
    ),
    tools=[get_treasury_yields],
    sub_agents=[_search_agent()],
    after_tool_callback=_recover_subagent_result,
    output_schema=schemas.AnalystNote,
    output_key='macro_note',
)

pm_agent = Agent(
    model=_model(),
    name='pm_agent',
    mode='single_turn',
    disallow_transfer_to_parent=True,
    description=(
        'The portfolio manager. Turns a ticker or company name into a project '
        'brief: the mandate, the questions the report must resolve, and a '
        'per-desk delegation plan for the analyst team.'
    ),
    instruction=(
        'You are the portfolio manager opening a new research project. You '
        'will receive a user message - often just a ticker or a company '
        'name. You do not do the research yourself; you scope it and '
        'delegate it.\n\n'
        'First establish the subject. Resolve the ticker, calling '
        'search_agent if you were handed a company name, an ambiguous '
        'symbol, or something you cannot place. If no ticker can be '
        "resolved, leave ticker empty and say why in open_items - do not "
        'invent a symbol.\n\n'
        'Then write the ProjectBrief:\n'
        '- mandate: the investment question this project has to answer, in '
        'one line.\n'
        '- thesis_questions: the specific things the finished report must '
        'resolve for that mandate to be answered.\n'
        '- workstreams: one entry for each of the four desks - '
        'balance_sheet_agent (balance sheet figures, 10-K disclosures), '
        'valuation_agent (DCF, comparable companies, precedent '
        'transactions), technical_agent (price action, RSI, moving '
        'averages, volume), macro_agent (interest rates, bond yields). For '
        'each desk set priority to core, supporting, or skip, then write a '
        'mandate telling that desk what specifically to deliver and the '
        'key_questions it must answer. Scope each desk to what actually '
        'moves the thesis instead of asking everyone for everything, and '
        'make the questions specific to this company rather than generic '
        'desk boilerplate. Marking a desk skip is a real decision, not a '
        'failure: a pure technicals question does not need the balance '
        'sheet desk, and a request with no company or market angle can skip '
        'all four.\n'
        '- constraints: time horizon, risk appetite, style, or anything '
        'else the user stated or implied.\n'
        '- deliverable: what the finished piece should be.\n\n'
        'Do not address the user directly and do not ask questions.'
    ),
    sub_agents=[_search_agent()],
    after_tool_callback=_recover_subagent_result,
    output_schema=schemas.ProjectBrief,
    output_key='project_brief',
)


vp_agent = Agent(
    model=_model(),
    name='vp_agent',
    mode='single_turn',
    disallow_transfer_to_parent=True,
    description=(
        'Acts as the reviewing VP over the analyst sub-agents: reconciles '
        'their queued notes into one consensus view before drafting_agent '
        'is allowed to use any of them.'
    ),
    instruction=(
        'You are the VP reviewing analyst notes before they reach a client. '
        'You take no arguments - the notes are already queued in session '
        'state below, one per analyst that actually ran (a blank value '
        'means that analyst did not run for this request; ignore it):\n\n'
        'balance_sheet_agent: {balance_sheet_note?}\n'
        'valuation_agent: {valuation_note?}\n'
        'technical_agent: {technical_note?}\n'
        'macro_agent: {macro_note?}\n\n'
        'Cross-check the notes that are present: do their stances and key '
        'points agree or contradict each other (e.g. a bullish valuation '
        'note against a bearish technical note)? List every concrete '
        'contradiction in conflicts. Set overall_stance to the reconciled '
        'directional read across all present notes (not_applicable if none '
        'have a directional stance) and agreement_score for how much they '
        'agree (1.0 = fully aligned, 0.0 = sharply conflicting). Include '
        'every present note, unmodified, in notes. If a note is too thin '
        '(e.g. empty key_points, or a summary with no data behind it) or '
        "directly contradicts another without explanation, add an entry to "
        "revision_requests naming the agent and what's wrong, and set "
        'approved to false; otherwise set approved to true. Do not address '
        'the user directly and do not ask questions.'
    ),
    output_schema=schemas.ConsensusReport,
    output_key='consensus_report',
)

source_agent = Agent(
    model=_model(),
    name='source_agent',
    mode='single_turn',
    disallow_transfer_to_parent=True,
    description=(
        'Identifies and lists the specific sources - URLs, publishers, and '
        'titles - backing the facts needed to answer a user request.'
    ),
    instruction=(
        'You will receive a user request. Use '
        'google_search and url_context to find the specific pages that back '
        'the facts a good answer would rely on. Do not summarize or explain '
        'the facts themselves - that is another agent\'s job. Output only a '
        'short list of sources, one per line, each as "Title - URL". Cap it '
        'at the ~10 best sources total, covering the most important facts '
        'first, rather than trying to cite one for every fact. If you find '
        'no sources worth citing, output exactly "No sources found." '
        + _URL_LOOKUP_CAP + ' Do not address the user directly and do not '
        'ask questions.'
    ),
    tools=[google_search, url_context],
)

_ANALYST_NOTE_KEYS = (
    'balance_sheet_note',
    'valuation_note',
    'technical_note',
    'macro_note',
)


def _require_consensus_report(callback_context):
    """Blocks drafting_agent from running on unreviewed analyst notes.

    If any analyst ran but vp_agent hasn't reconciled their notes into a
    consensus_report yet, short-circuits drafting_agent's turn with a
    message telling the caller to run vp_agent first, so an analyst's raw
    output can never reach the client-facing draft unvetted. Requests where
    no analyst ran (e.g. no company/market angle) pass through untouched -
    there's nothing for vp_agent to review.

    A blank note counts as not having run: an analyst that skipped its turn
    for want of data (see `_enforce_social_skip`) leaves its key in state
    but has nothing for vp_agent to review, so on its own it must not block
    the draft.
    """
    state = callback_context.state
    if not any(state.get(key) for key in _ANALYST_NOTE_KEYS):
        return None
    if state.get('consensus_report') is not None:
        return None
    return types.Content(
        role='model',
        parts=[types.Part(text=(
            'drafting_agent blocked: analyst notes are queued in state but '
            'vp_agent has not reviewed them yet. Call vp_agent, then call '
            'drafting_agent again.'
        ))],
    )


drafting_agent = Agent(
    model=_model(),
    name='drafting_agent',
    mode='single_turn',
    disallow_transfer_to_parent=True,
    description=(
        'Writes a clear, well-structured draft reply from the user request '
        'and the VP-reviewed consensus of the analyst sub-agents.'
    ),
    instruction=(
        'You will receive the user request and a list of sources. Any '
        'analyst research is the VP-reviewed consensus below - use only '
        'this as the analyst findings, never raw analyst output:\n\n'
        'consensus_report: {consensus_report?}\n\n'
        "The PM's brief for this project, if one was written, is below. "
        'Its mandate and deliverable define what the piece is supposed '
        'to be; write to them:\n\n'
        'project_brief: {project_brief?}\n\n'
        '(A blank consensus_report means no analyst research applied to '
        'this request.) Write a clear, well-structured draft reply to the '
        'original user in a friendly, direct tone, answering the '
        "brief's thesis_questions and weaving in only the parts of the "
        'consensus_report relevant to what was asked. If the consensus '
        "report's conflicts or revision_requests are non-empty, reflect "
        'that disagreement/uncertainty honestly rather than presenting a '
        'single confident view. If sources were provided, end the reply '
        'with a short "Sources" section listing them; omit it if none '
        'were found.'
    ),
    before_agent_callback=_require_consensus_report,
    output_key='final_draft',
)

# ------------------------------------------------- A: per-turn state hygiene
_TURN_SCOPED_STATE_KEYS = _ANALYST_NOTE_KEYS + (
    'project_brief',
    'consensus_report',
    'valuation_pass_a',
    'valuation_pass_b',
    'final_draft',
)


def _reset_turn_state(callback_context):
    """Clears last turn's analyst notes before a new request is worked on.

    `output_key` writes are session-scoped, not turn-scoped, so notes survive
    until something overwrites them. Without this, a follow-up question that
    runs a different subset of analysts would have vp_agent reconcile fresh
    notes against stale ones left over from an earlier, unrelated ticker -
    and an interrupted turn would leave those notes behind indefinitely.
    Blanking rather than deleting keeps the `{note?}` templating contract:
    a blank value reads as "this analyst did not run".
    """
    for key in _TURN_SCOPED_STATE_KEYS:
        if callback_context.state.get(key):
            callback_context.state[key] = ''
    return None


# ------------------------------- B: the review gate on the user-facing answer
def _require_reviewed_answer(callback_context):
    """Makes the reviewed draft the answer that actually reaches the user.

    `_require_consensus_report` guards drafting_agent, but root_agent writes
    the final message itself and is free to skip drafting, or to run the
    whole pipeline and then ignore what came back. Observed in practice:
    with a real RSI of 74.38 sourced from get_technical_snapshot and a
    correct draft written from it, root still replied "I cannot provide the
    real-time RSI as my information is not live" - discarding tool-sourced
    data in favour of its own background knowledge.

    So the gate sits on the output that leaves the system. If analysts ran
    without review, the answer is refused; if a reviewed draft exists, that
    draft is what ships, verbatim.
    """
    state = callback_context.state
    analysts_ran = any(state.get(key) for key in _ANALYST_NOTE_KEYS)

    if analysts_ran and not state.get('consensus_report'):
        ran = [k.removesuffix('_note') for k in _ANALYST_NOTE_KEYS if state.get(k)]
        return types.Content(
            role='model',
            parts=[types.Part(text=(
                "I can't give you this answer: the analyst research it would "
                'be built on never made it through review.\n\n'
                f"Analysts that produced findings: {', '.join(ran)}. The VP "
                'review step that reconciles them did not complete, so those '
                'findings are unvetted and may contradict each other.\n\n'
                'Please re-run the request.'
            ))],
        )

    draft = state.get('final_draft')
    if draft:
        return types.Content(role='model', parts=[types.Part(text=str(draft))])
    return None



root_agent = Agent(
    model=_model(),
    name='root_agent',
    description='A helpful assistant for user questions.',
    before_agent_callback=_reset_turn_state,
    after_tool_callback=_recover_subagent_result,
    after_agent_callback=_require_reviewed_answer,
    instruction=(
        'You are a chatbot. For every user message, reassemble the answer '
        'from specialist sub-agents rather than answering from scratch:\n'
        '1. Call pm_agent with the user message. It resolves the ticker '
        'and returns a ProjectBrief scoping the work into one workstream '
        'per analyst desk.\n'
        '2. Call every analyst the brief marks core or supporting, and '
        'only those, passing each one its own workstream mandate and '
        'key_questions from the brief. Do not call a desk the brief '
        'marked skip, do not re-scope the work yourself, and do not '
        'substitute the raw user message for the mandate the PM wrote. '
        'If the brief skips all four desks, skip straight to step 5.\n'
        '3. If you called any analyst agents, call vp_agent next (it takes '
        'no arguments - it reads the queued analyst notes itself) to have '
        'it review and reconcile them into a consensus_report. If its '
        'approved field is false, re-call only the specific analyst '
        'agent(s) named in its revision_requests, then call vp_agent once '
        'more - do not loop through another revision round after that; '
        'proceed with whatever consensus_report you have. Skip this step '
        'entirely if you called no analyst agents.\n'
        '4. If you called any analyst agents, also call source_agent with '
        "the brief's mandate to gather the sources backing them.\n"
        '5. Call drafting_agent, passing along the user message and the '
        'source list, to produce a draft reply. You do not need to pass '
        'along analyst notes, the consensus_report or the brief '
        'yourself - drafting_agent reads the reviewed consensus_report '
        'and the brief from state directly.\n'
        "6. drafting_agent's draft is the answer. It is written from "
        'tool-sourced figures that have already been reviewed, so send '
        'it as-is. Never replace it with an answer from your own '
        'background knowledge, and never tell the user you lack live or '
        'real-time data when a tool supplied that figure - the data '
        'tools are live, and the draft is built on what they '
        'returned.\n\n'
        'Never mention the sub-agents or this internal process to the user - '
        'just give them the final, reassembled answer.'
    ),
    sub_agents=[
        pm_agent,
        balance_sheet_agent,
        valuation_agent,
        technical_agent,
        macro_agent,
        vp_agent,
        source_agent,
        drafting_agent,
    ],
)
