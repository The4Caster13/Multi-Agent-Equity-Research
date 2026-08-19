"""Structured output types for the analyst -> VP review pipeline.

Analyst agents write an `AnalystNote` to session state (via `output_key`)
instead of returning free-text; `vp_agent` reads those notes back out of
state and reconciles them into a single `ConsensusReport`, which is the only
thing `drafting_agent` is allowed to read.
"""

from typing import Literal

from pydantic import BaseModel, Field

Stance = Literal['bullish', 'neutral', 'bearish', 'not_applicable']


ValuationMethod = Literal['dcf', 'comparable_companies', 'precedent_transactions']


class ValuationEstimate(BaseModel):
    """One valuation method's result within a single independent pass."""

    method: ValuationMethod = Field(description='Which valuation method this estimate came from.')
    value_per_share: float | None = Field(
        default=None, description='Implied per-share value, or null if this method could not be run.'
    )
    enterprise_value: float | None = Field(
        default=None, description='Implied enterprise value, or null if not computed.'
    )
    key_assumptions: list[str] = Field(
        default_factory=list,
        description=(
            'Every assumption behind this estimate (discount rate, terminal growth, '
            'peer set, deal multiples). Stated explicitly so a second independent '
            'pass can be compared against it.'
        ),
    )
    unavailable_reason: str | None = Field(
        default=None,
        description=(
            'Why this method could not be run, if it could not. Set this instead of '
            'inventing figures when no data source backs the method.'
        ),
    )


class ValuationPass(BaseModel):
    """One independent valuation run, produced with no visibility into any other pass."""

    pass_id: str = Field(description="Which pass produced this, 'a' or 'b'.")
    estimates: list[ValuationEstimate] = Field(description='One entry per valuation method attempted.')
    implied_fair_value_per_share: float | None = Field(
        default=None, description="This pass's single reconciled fair value per share, if any."
    )
    current_price: float | None = Field(
        default=None, description='The current market price this pass compared against.'
    )
    stance: Stance = Field(description="This pass's directional read.")
    confidence: float = Field(description='Confidence in this pass, from 0.0 to 1.0.')
    data_gaps: list[str] = Field(
        default_factory=list, description='What this pass could not verify or source.'
    )
    as_of: str | None = Field(default=None, description='As-of date/period for the data used.')


class ValuationCrossCheck(BaseModel):
    """The back-check of two independent valuation passes against each other."""

    pass_a_fair_value: float | None = Field(default=None, description="Pass A's fair value per share.")
    pass_b_fair_value: float | None = Field(default=None, description="Pass B's fair value per share.")
    divergence_pct: float | None = Field(
        default=None,
        description=(
            'Absolute difference between the two fair values as a percentage of their '
            'mean. Null if either pass produced no fair value.'
        ),
    )
    agreements: list[str] = Field(
        default_factory=list, description='Conclusions and assumptions both passes independently reached.'
    )
    disagreements: list[str] = Field(
        default_factory=list,
        description='Where the two passes diverged, and which assumption drove the divergence.',
    )
    reconciled_fair_value: float | None = Field(
        default=None, description='The fair value to carry forward after weighing both passes.'
    )
    reproducible: bool = Field(
        description=(
            'Whether the two passes agree closely enough (divergence under ~15%) that the '
            'valuation should be treated as reproducible rather than assumption-driven noise.'
        )
    )


AnalystName = Literal[
    'balance_sheet_agent', 'valuation_agent', 'technical_agent', 'macro_agent'
]

WorkstreamPriority = Literal['core', 'supporting', 'skip']


class Workstream(BaseModel):
    """One analyst desk's assignment on a research project."""

    analyst: AnalystName = Field(description='Which analyst agent this workstream is assigned to.')
    priority: WorkstreamPriority = Field(
        description=(
            "'core' if this desk is central to the mandate, 'supporting' if its "
            "input is worth having but not decisive, 'skip' if it has nothing "
            'useful to contribute to this particular question.'
        )
    )
    mandate: str = Field(
        description=(
            'What this desk specifically has to deliver - scoped to what moves '
            'the thesis, not a restatement of the desk\'s general job.'
        )
    )
    key_questions: list[str] = Field(
        default_factory=list,
        description='The specific questions this desk must answer. Empty if the desk is skipped.',
    )


class ProjectBrief(BaseModel):
    """The PM's scoping of a research project, written before any work starts.

    Turns a bare ticker into an explicit mandate and a per-desk delegation
    plan, so which analysts run - and what each is asked for - is a recorded
    decision rather than an ad-hoc judgement made mid-pipeline.
    """

    ticker: str = Field(description="The resolved stock ticker, or '' if it could not be resolved.")
    company_name: str | None = Field(default=None, description='The company the ticker belongs to.')
    mandate: str = Field(description='The investment question this project must answer, in one line.')
    thesis_questions: list[str] = Field(
        description='The specific things the finished report has to resolve for the mandate to be answered.'
    )
    workstreams: list[Workstream] = Field(
        description='One entry per analyst desk, including desks marked skip.'
    )
    constraints: list[str] = Field(
        default_factory=list,
        description='Time horizon, style, or anything else the user specified or implied.',
    )
    deliverable: str = Field(description='What the finished piece should be.')
    open_items: list[str] = Field(
        default_factory=list,
        description=(
            'What the PM could not pin down - an unresolvable ticker, an ambiguous '
            'request. Recorded rather than guessed at.'
        ),
    )


class AnalystNote(BaseModel):
    agent: str = Field(description="The analyst agent's name, e.g. 'valuation_agent'.")
    stance: Stance = Field(
        description=(
            "This analyst's directional read, or 'not_applicable' if the "
            'analysis has no bullish/bearish angle (e.g. macro '
            'context with no clear directional read).'
        )
    )
    confidence: float = Field(description='Confidence in this note, from 0.0 to 1.0.')
    summary: str = Field(description='Concise summary of the findings.')
    key_points: list[str] = Field(description='The specific facts/figures backing the summary.')
    data_gaps: list[str] = Field(
        default_factory=list,
        description='What could not be verified or was missing, if anything.',
    )
    as_of: str | None = Field(
        default=None, description='As-of date/period for the data used, if applicable.'
    )
    cross_check: ValuationCrossCheck | None = Field(
        default=None,
        description=(
            'Set only by valuation_agent: the back-check of its two independent '
            'valuation passes against each other.'
        ),
    )


class ConsensusReport(BaseModel):
    overall_stance: Stance = Field(description='The reconciled, overall directional read.')
    agreement_score: float = Field(
        description='How much the analyst notes agree with each other, from 0.0 (sharp conflict) to 1.0 (full agreement).'
    )
    notes: list[AnalystNote] = Field(description='The analyst notes this report reconciles.')
    conflicts: list[str] = Field(
        default_factory=list,
        description='Specific contradictions between analyst notes, if any.',
    )
    revision_requests: list[str] = Field(
        default_factory=list,
        description=(
            "Which analyst agent(s) should be re-run and why (e.g. 'technical_agent: "
            "note is missing volume context'). Empty if none need revision."
        ),
    )
    approved: bool = Field(
        description='Whether this report is solid enough to hand to drafting_agent as-is.'
    )
