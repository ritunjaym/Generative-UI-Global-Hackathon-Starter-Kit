# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

This repo is the team fork of the Generative UI Global Hackathon Starter Kit, adapted for **Pair-PM** — a 2-person, 2.5-hour build for the May 9, 2026 hackathon. Build is in progress on the `pair-pm` branch.

**Source of truth for product behavior:** [`docs/pair-pm-spec.pdf`](docs/pair-pm-spec.pdf)
**Source of truth for the build plan:** [`docs/team-plan.md`](docs/team-plan.md)
**Source of truth for the demo:** [`docs/demo-script.md`](docs/demo-script.md)
**Integration contract (locked, scaffolded):**
- Frontend: [`apps/frontend/src/lib/pair-pm/types.ts`](apps/frontend/src/lib/pair-pm/types.ts)
- Backend: [`apps/agent/src/pair_pm_state.py`](apps/agent/src/pair_pm_state.py)

## Commands

The kit is an npm workspace with a Python sub-app under `apps/agent` managed by `uv`.

- `npm install` — installs JS deps and runs `uv sync` for the agent (postinstall). Requires Node 20+, Python 3.10+, `uv`, and Docker Desktop running.
- `npm run dev` — pre-flights env, boots Postgres + Redis + Intelligence via `deployment/docker-compose.yml`, then runs UI + BFF + agent concurrently. **On the `pair-pm` branch, `SKIP_NOTION_CHECK=1` in `apps/agent/.env.example` bypasses the Notion checks** so this works without Notion credentials.
- `npm run dev:full` — same as `dev` plus the deployable MCP server.
- `npm run dev:ui` / `dev:bff` / `dev:agent` / `dev:mcp` — run a single workspace.
- `npm run dev:agent` — runs `uv run langgraph dev --port 8133` from `apps/agent`.
- `npm run build` / `start` / `lint` — proxy to the `frontend` workspace.
- `npm run dev:infra:down` — tear down the Docker stack.
- `npm run check-env` — env pre-flight standalone.

**Required env (in both `.env` and `apps/agent/.env`):** `COPILOTKIT_LICENSE_TOKEN`, `GEMINI_API_KEY`. Notion vars can stay empty when `SKIP_NOTION_CHECK=1`.

## Repo layout

```
apps/
  frontend/   Next.js — PRD editor + flow diagram + comment cards live here
  bff/        backend-for-frontend (CopilotKit runtime bridge)
  agent/      LangGraph Deep Agent (Python, uv); runtime on :8133
  mcp/        deployable MCP server (mcp-use); not used for Pair-PM
deployment/   docker-compose.yml — Postgres + Redis + Intelligence
scripts/      check-env.sh (patched), seed-default-user.sh
docs/         spec, team plan, demo script
data/         Notion sample data (irrelevant — Pair-PM doesn't use Notion)
dev-docs/     setup, architecture, model-switching, troubleshooting
```

The kit's example product (Notion "Leads" canvas) is being **replaced** for Pair-PM. The leads-related agent prompt + frontend cards are getting swapped out; the kit's plumbing (CopilotKit runtime, Postgres threads, LangGraph agent harness) stays.

## What Pair-PM is

A senior-PM agent that lives inside a PRD doc. As the PM types, the agent (a) draws a user-flow diagram next to the prose, (b) posts reviewer-style comments tied to specific quotes, and (c) on demand emits an engineering-ready Spec Card. **It is not a chatbot** — the agent reacts to writing, not to questions.

### Three-pane layout (all visible simultaneously)

- **LEFT (50%)** — PRD editor (TipTap, Notion-style: heading/paragraph/list only).
- **RIGHT-TOP (~60% height)** — Live flow diagram (ReactFlow with custom node component).
- **RIGHT-BOTTOM (~40%)** — Reviewer comment cards stacked, then a "resolved" row below. Action bar above the canvas: *Generate engineering handoff* button + `resolved N/M` counter.

### Generative-UI surface mapping

The kit exposes three Gen-UI tiers (controlled / declarative / open-ended). Pair-PM uses one and a half:
- **Controlled (`useComponent`)** — Comment Card and Spec Card. Predefined React components; agent supplies props.
- **CopilotKit shared state (not A2UI)** — flow-diagram nodes/edges. The agent writes `PairPMState` to shared state; the frontend renders directly with ReactFlow. We deliberately don't use A2UI here — its renderer-catalog model adds friction when we have one custom shape (ReactFlow nodes).
- Open-ended (raw HTML / MCP Apps) — not used.

## Stack

- **Framework:** Next.js (kit default)
- **Editor:** TipTap (heading/paragraph/list only)
- **Diagram:** ReactFlow with a custom node component (horizontal/branching tree only — no force-directed layout)
- **Animation:** Framer Motion (200ms stagger fade-in, yellow pulse, green flash)
- **Agent surface:** CopilotKit — `useComponent` for cards, `useCoAgent` shared state for the diagram
- **Agent runtime:** LangGraph Deep Agent in `apps/agent/`. `AGENT_RUNTIME=gemini-flash-deep` (kit default). Swap to `claude-sonnet-4-6-react` in `apps/agent/.env` if Gemini misbehaves on stable IDs / exact quoting (requires `ANTHROPIC_API_KEY`).
- **LLM:** Gemini 3.1 Flash-Lite
- **Persistence:** Postgres + Redis via the kit's docker-compose
- **Skipped (deliberately):** A2UI for the diagram, MCP, Notion, Daytona, LangSmith

## Core architectural invariants

Load-bearing for the demo. If broken, the "agent is drawing while I type" effect collapses:

1. **Stable node IDs across updates.** Agent emits the *full* `PairPMState` each tick; frontend diffs by `id` and animates only changes. New paragraphs add new nodes — existing nodes are never recreated. Test in Hour 1, not Hour 3.
2. **Editor → agent is debounced, not streamed.** Push doc content on TipTap blur or every 2 seconds. Live-typing streaming is explicitly out of scope.
3. **Additive diagram growth.** New paragraphs sprout new branches; existing layout stays put.
4. **Comments quote exact prose.** Every comment carries a verbatim `quote` and (when possible) a `relatedNodeId` that pulses yellow on hover. Vague comments ("consider edge cases") are banned by the prompt.
5. **JSON-schema-validate the agent output; on parse failure retain previous state.** Never crash the UI mid-demo.
6. **1.5s delay** between agent emitting a comment and the card fading in — makes the reviewer feel like it's "thinking" rather than canned.

## Data model

The contract is in two scaffolded files (single source of truth):
- TS: `apps/frontend/src/lib/pair-pm/types.ts` — `PairPMState`, `AgentState` (= PairPMState + frontend-set inputs `docContent` and `requestSpecCard`), `initialAgentState`
- Python: `apps/agent/src/pair_pm_state.py` — TypedDict mirror, `AgentStateExt`, `EMPTY_STATE`

The agent emits the full `PairPMState` shape on every update — never diffs. When the doc is empty, the agent emits empty arrays, not placeholder content. Field names are locked from spec section 4 — don't rename.

## Agent prompt

The Pair-PM system prompt (spec section 5) replaces the leads-related prompt in `apps/agent/src/runtime.py`. Three responsibilities, in order: maintain flow diagram, post reviewer comments tied to exact quotes, and (on `requestSpecCard=true`) emit the spec card with refined PRD + Given/When/Then acceptance criteria + resolved Q&As. The agent's structured output should target the `PairPMState` TypedDict.

## Demo (locked)

The demo PRD is **"Date-range filtering for analytics dashboard"** with a fixed paragraph progression in `docs/demo-script.md` (frames 1–5 from spec section 3). Don't ad-lib — type the same paragraphs you tested with. The wow moment is 0:15–0:23: the first 5 nodes drawing themselves into existence after the first paragraph lands.

## Pre-installed agent skills

The kit ships skills under `.claude/skills/`, `.cursor/skills/`, and `.agent/skills/`. They cover CopilotKit v2 (`copilotkit-{setup, develop, integrations, debug, upgrade, contribute, agui, self-update}`) and MCP authoring (`mcp-builder`, `mcp-apps-builder`, `chatgpt-app-builder`). Use them when working in the matching subsystem rather than re-deriving conventions.

Refresh the CopilotKit skills with `npx skills add copilotkit/skills --full-depth -y`.

Hosted CopilotKit docs MCP available at `https://mcp.copilotkit.ai/mcp` for live upstream reference.

## Risks the spec calls out (and mitigations)

- Diagram redraws from scratch → flicker. *Mitigation:* stable IDs (above).
- Live demo breaks on stage. *Mitigation:* record the fallback video at the **start** of Hour 3, not the end.
- Pre-scripted feel. *Mitigation:* rehearse the cadence; reactions should feel emergent but be reliably triggered.
- Agent emits malformed JSON → state breaks. *Mitigation:* JSON validator that retains previous state on parse failure.
