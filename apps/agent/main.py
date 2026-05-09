"""LangGraph entry point for `langgraph dev --port 8133`.

Wires:
- A switchable runtime (Gemini Flash-Lite + deepagents | Gemini Flash-Lite + react |
  Claude Sonnet 4.6 + react) selected by `AGENT_RUNTIME`. See
  `src/runtime.py` and the README's "Switching to a different model".
- TimingMiddleware (per-turn wall-time logging — see `src/timing.py`)
- PairPMStateMiddleware + CopilotKitMiddleware for canvas state + AG-UI

Pair-PM has no backend tools (no Notion/MCP integration for this hackathon).
Frontend tools (`useComponent` renderers, shared-state setters) are declared
on the React side and must NOT appear in the Python tool list.
"""

from __future__ import annotations

import os

from dotenv import load_dotenv

from src.intelligence_cleanup import wipe_orphan_threads
from src.prompts import SYSTEM_PROMPT
from src.runtime import build_graph


# Load .env early so GEMINI_API_KEY / ANTHROPIC_API_KEY are visible.
load_dotenv()


# `langgraph dev` uses an in-memory checkpoint store, so every agent boot
# starts with zero threads in LangGraph but the Intelligence Postgres
# still holds the chat history from the previous run. Without this
# cleanup, the next `getCheckpointByMessage` lookup throws "Message not
# found" and surfaces in the UI as an opaque rxjs stack trace.
# See `src/intelligence_cleanup.py` for the full rationale.
wipe_orphan_threads()


# Stub-key warnings for the active runtime live closer to the runtime selector.
# The Gemini runtimes still warn here so the message is loud at boot.
_AGENT_RUNTIME = os.getenv("AGENT_RUNTIME", "gemini-flash-deep")
print(f"[runtime] AGENT_RUNTIME={_AGENT_RUNTIME}", flush=True)

_gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or ""
if _AGENT_RUNTIME.startswith("gemini-") and (
    not _gemini_key or _gemini_key.startswith("stub")
):
    print(
        "\n  GEMINI_API_KEY is unset or a stub.\n"
        "   The agent will boot but chat will fail on the first turn.\n"
        "   Get a key at https://aistudio.google.com → Get API key,\n"
        "   then set GEMINI_API_KEY in v2/.env and v2/agent/.env.\n",
        flush=True,
    )

_anthropic_key = os.getenv("ANTHROPIC_API_KEY") or ""
if _AGENT_RUNTIME == "claude-sonnet-4-6-react" and (
    not _anthropic_key or _anthropic_key.startswith("stub")
):
    print(
        "\n  ANTHROPIC_API_KEY is unset or a stub.\n"
        "   The agent will boot but chat will fail on the first turn.\n"
        "   Set ANTHROPIC_API_KEY in .env and apps/agent/.env.\n",
        flush=True,
    )

_kimi_key = os.getenv("KIMI_API_KEY") or ""
if _AGENT_RUNTIME.startswith("kimi-") and (
    not _kimi_key or _kimi_key.startswith("stub")
):
    print(
        "\n  KIMI_API_KEY is unset or a stub.\n"
        "   The agent will boot but chat will fail on the first turn.\n"
        "   Set KIMI_API_KEY in .env and apps/agent/.env.\n",
        flush=True,
    )


# Pair-PM has no backend tools — skip Notion/MCP loading.
backend_tools: list = []


_use_noop = (
    (_AGENT_RUNTIME.startswith("gemini-")
     and (not _gemini_key or _gemini_key.startswith("stub")))
    or (_AGENT_RUNTIME.startswith("kimi-")
        and (not _kimi_key or _kimi_key.startswith("stub")))
)
if _use_noop:
    print(
        "\n[runtime] API key missing or stub — using noop fallback graph.\n"
        "          Chat will reply with a setup pointer instead of hanging.\n",
        flush=True,
    )

# Frontend tools are NOT listed here — see module docstring.
graph = build_graph(
    "noop" if _use_noop else _AGENT_RUNTIME,
    tools=backend_tools,
    system_prompt=SYSTEM_PROMPT,
)


def main() -> None:
    """Entry point for `uv run dev` / `python -m agent`.

    `langgraph dev` is the canonical local-dev runner — this just exists to
    satisfy the `[project.scripts] dev = "agent:main"` entry point.
    """
    import subprocess

    subprocess.run(
        ["langgraph", "dev", "--port", "8133"],
        check=True,
    )


if __name__ == "__main__":
    main()
