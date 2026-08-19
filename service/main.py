"""HTTP front door for the `my_agent` ADK research pipeline.

The website cannot import a Python agent, so this wraps `root_agent` in a small
FastAPI service the Node/Express host proxies to.

    POST /research           ticker -> full report (blocking; used by native)
    GET  /research/stream    ticker -> SSE progress + final report (used by web)
    GET  /health

A full run fans out across six analyst agents, a reviewing VP, and a drafter,
so it takes minutes, not seconds. That is why the streaming endpoint exists:
the browser gets told which analyst is working instead of staring at a spinner.

Run it with the interpreter that has google-adk installed:

    python3.11 -m uvicorn service.main:app --port 8000
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import time
import uuid
from pathlib import Path
from typing import Any, AsyncIterator, Callable

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parent.parent

# The agent keeps its own .env (GOOGLE_API_KEY); load it before importing the
# agent module so the Gemini client picks the key up at construction time.
load_dotenv(ROOT / "my_agent" / ".env")

from my_agent.agent import root_agent  # noqa: E402
from google.adk.runners import Runner  # noqa: E402
from google.adk.sessions import InMemorySessionService  # noqa: E402
from google.genai import types  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("research")

APP_NAME = "equity-labs"
USER_ID = "web"
TICKER_RE = re.compile(r"^[A-Za-z][A-Za-z.\-]{0,9}$")

session_service = InMemorySessionService()
runner = Runner(agent=root_agent, app_name=APP_NAME, session_service=session_service)

app = FastAPI(title="Equity Labs research agent")

# Express proxies same-origin in production; this is for `npm run dev`, where
# the Expo dev server is on :8081 and this service is on :8000.
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get(
        "RESEARCH_CORS_ORIGINS", "http://localhost:8081,http://localhost:19006"
    ).split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------------------------- prompt --

def _prompt(ticker: str) -> str:
    return (
        f"Produce an equity research report on {ticker}.\n\n"
        "Cover, where the data supports it: balance sheet strength and recent "
        "financials; valuation against peers and history; the technical picture; "
        "and the macro rate backdrop.\n\n"
        "Finish with a clear overall view and the key risks to it. Be specific "
        "about figures and state the as-of date for anything time-sensitive."
    )


# ------------------------------------------------------------------ describing --

# Names the analysts by what a reader would call them.
AGENT_LABELS = {
    "root_agent": "Orchestrating",
    "pm_agent": "PM scoping the project",
    "balance_sheet_agent": "Reading the balance sheet",
    "valuation_agent": "Running valuation",
    "technical_agent": "Checking price action",
    "macro_agent": "Reading the rate backdrop",
    "vp_agent": "VP reviewing analyst notes",
    "source_agent": "Collecting sources",
    "drafting_agent": "Drafting the report",
    "search_agent": "Searching",
}


# ADK plumbing the reader has no use for: `set_model_response` is how structured
# output is returned, and a transfer is already reported by the target's events.
INTERNAL_TOOLS = {"set_model_response", "transfer_to_agent"}


def _describe(event: Any) -> dict | None:
    """Turns an ADK event into a progress line, or None if it is not worth one."""
    author = getattr(event, "author", None) or "agent"
    label = AGENT_LABELS.get(author, author.replace("_", " "))

    calls = []
    try:
        calls = event.get_function_calls() or []
    except Exception:
        pass

    if calls:
        names: list[str] = []
        for call in calls:
            name = getattr(call, "name", None)
            if name and name not in INTERNAL_TOOLS and name not in names:
                names.append(name)  # a fan-out repeats the same name; show it once
        if names:
            return {"agent": author, "label": label, "detail": ", ".join(names)}

    return {"agent": author, "label": label, "detail": None}


def _final_text(events_text: list[tuple[str, str]]) -> str:
    """The reply shown to the user: the orchestrator's last word, else the last
    non-empty final response from anyone."""
    for author, text in reversed(events_text):
        if author == root_agent.name and text.strip():
            return text.strip()
    for _author, text in reversed(events_text):
        if text.strip():
            return text.strip()
    return ""


# ---------------------------------------------------------------------- runner --

STUB = os.environ.get("RESEARCH_STUB") == "1"
FIXTURE = Path(__file__).parent / "fixtures" / "sample_report.json"


async def _run_stub(ticker: str, on_progress: Callable[[dict], Any] | None) -> dict:
    """Replays a recorded run so the report UI can be worked on without waiting
    minutes and spending quota on every reload. RESEARCH_STUB=1."""
    canned = json.loads(FIXTURE.read_text())
    for name in (
        "pm_agent",
        "balance_sheet_agent",
        "valuation_agent",
        "technical_agent",
        "macro_agent",
        "vp_agent",
        "drafting_agent",
    ):
        if on_progress:
            await on_progress(
                {"agent": name, "label": AGENT_LABELS.get(name, name), "detail": None}
            )
        await asyncio.sleep(0.4)

    canned["ticker"] = ticker
    canned["generatedAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    return canned


async def run_research(
    ticker: str,
    on_progress: Callable[[dict], Any] | None = None,
) -> dict:
    ticker = ticker.strip().upper()

    if STUB:
        log.warning("RESEARCH_STUB=1 - replaying %s, no agent call", FIXTURE.name)
        return await _run_stub(ticker, on_progress)

    session_id = uuid.uuid4().hex
    started = time.monotonic()

    await session_service.create_session(
        app_name=APP_NAME, user_id=USER_ID, session_id=session_id
    )

    message = types.Content(role="user", parts=[types.Part(text=_prompt(ticker))])
    finals: list[tuple[str, str]] = []
    seen: set[str] = set()

    async for event in runner.run_async(
        user_id=USER_ID, session_id=session_id, new_message=message
    ):
        step = _describe(event)
        if step and on_progress:
            key = f"{step['agent']}|{step['detail']}"
            if key not in seen:
                seen.add(key)
                await on_progress(step)

        is_final = False
        try:
            is_final = event.is_final_response()
        except Exception:
            pass

        content = getattr(event, "content", None)
        if is_final and content and getattr(content, "parts", None):
            text = "".join(p.text or "" for p in content.parts if hasattr(p, "text"))
            if text.strip():
                finals.append((getattr(event, "author", ""), text))

    session = await session_service.get_session(
        app_name=APP_NAME, user_id=USER_ID, session_id=session_id
    )
    state = dict(getattr(session, "state", {}) or {})

    consensus = state.get("consensus_report")
    if isinstance(consensus, str):
        try:
            consensus = json.loads(consensus)
        except json.JSONDecodeError:
            consensus = None

    return {
        "ticker": ticker,
        "report": _final_text(finals),
        "consensus": consensus,
        "elapsedSeconds": round(time.monotonic() - started, 1),
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }


def _validate(ticker: str) -> str:
    ticker = (ticker or "").strip()
    if not TICKER_RE.match(ticker):
        raise HTTPException(
            status_code=400,
            detail="Ticker must be 1-10 letters, e.g. AAPL or BRK.B.",
        )
    return ticker.upper()


# ------------------------------------------------------------------- endpoints --

class ResearchRequest(BaseModel):
    ticker: str = Field(description='Stock ticker symbol, e.g. "AAPL".')


@app.get("/health")
async def health() -> dict:
    return {"ok": True, "agent": root_agent.name, "model": "gemini-2.5-flash"}


@app.post("/research")
async def research(req: ResearchRequest) -> dict:
    ticker = _validate(req.ticker)
    log.info("research %s (blocking)", ticker)
    try:
        return await run_research(ticker)
    except Exception as exc:
        log.exception("research failed for %s", ticker)
        raise HTTPException(status_code=502, detail=f"Agent run failed: {exc}") from exc


@app.get("/research/stream")
async def research_stream(ticker: str = Query(...)) -> StreamingResponse:
    symbol = _validate(ticker)
    log.info("research %s (stream)", symbol)

    async def events() -> AsyncIterator[str]:
        queue: asyncio.Queue[dict | None] = asyncio.Queue()

        async def on_progress(step: dict) -> None:
            await queue.put({"type": "status", **step})

        async def drive() -> None:
            try:
                result = await run_research(symbol, on_progress)
                await queue.put({"type": "done", "result": result})
            except Exception as exc:  # surfaced to the client, not swallowed
                log.exception("stream run failed for %s", symbol)
                await queue.put({"type": "error", "message": str(exc)})
            finally:
                await queue.put(None)

        task = asyncio.create_task(drive())
        yield f"data: {json.dumps({'type': 'status', 'label': 'Starting', 'agent': 'root_agent', 'detail': symbol})}\n\n"

        try:
            while True:
                try:
                    item = await asyncio.wait_for(queue.get(), timeout=15)
                except asyncio.TimeoutError:
                    yield ": keep-alive\n\n"  # stops proxies closing an idle run
                    continue
                if item is None:
                    break
                yield f"data: {json.dumps(item)}\n\n"
        finally:
            if not task.done():
                task.cancel()

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
