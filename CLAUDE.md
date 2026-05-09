# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

This directory currently holds only `pair-pm-spec.pdf` — the build spec for **Pair-PM**, a Generative UI Global Hackathon project (May 9, 2026). The starter kit it builds on is **not yet cloned** into this directory; it lives at:

> https://github.com/jerelvelarde/Generative-UI-Global-Hackathon-Starter-Kit

Plan: clone that kit's contents into this directory (or treat this dir as the kit), then adapt it per `pair-pm-spec.pdf`. The spec is the source of truth for product behavior; the kit's `dev-docs/` is the source of truth for plumbing.

## Commands (after the starter kit is in place)

The kit is an npm workspace with a Python sub-app under `apps/agent` managed by `uv`.

- `npm install` — installs JS deps and runs `uv sync` for the agent (postinstall). Requires Node 20+, Python 3.10+, `uv`, and Docker Desktop running.
- `npm run dev` — pre-flights env (`scripts/check-env.sh`), boots Postgres + Redis + Intelligence via `deployment/docker-compose.yml`, seeds, then runs UI + BFF + agent concurrently.
- `npm run dev:full` — same as `dev` plus the MCP server.
- `npm run dev:ui` / `dev:bff` / `dev:agent` / `dev:mcp` — run a single workspace.
- `npm run dev:agent` runs `uv run langgraph dev --port 8133` from `apps/agent`.
- `npm run build` / `start` / `lint` — proxy to the `frontend` workspace.
- `npm run dev:infra:down` — tear down the Docker stack.
- `npm run check-env` — run env pre-flight standalone (lists missing keys, unreachable Notion DB, Docker daemon issues).

Required env (in both `.env` and `apps/agent/.env`): `COPILOTKIT_LICENSE_TOKEN`, Gemini API key, and (optionally for the demo) `NOTION_TOKEN` + `NOTION_LEADS_DATABASE_ID`. For Pair-PM, MCP/Notion can stay disabled.

## Repo layout (from the kit)

```
apps/
  frontend/   Next.js — PRD editor + flow-diagram canvas + comment pane live here
  bff/        backend-for-frontend (CopilotKit runtime bridge)
  agent/      LangGraph Deep Agent (Python, uv); runtime on :8133
  mcp/        deployable MCP server (mcp-use); optional for Pair-PM
deployment/   docker-compose.yml — Postgres + Redis + Intelligence
scripts/      check-env.sh, seed-default-user.sh
data/         Notion sample data (irrelevant to Pair-PM demo)
dev-docs/     setup, architecture, model-switching, troubleshooting, etc.
```

The kit's example product (a Notion "Leads" canvas) lives across these surfaces — for Pair-PM you replace the leads-related agent prompt and frontend cards, but keep the kit's plumbing.

## What Pair-PM is

A senior-PM agent that lives inside a PRD doc. As the PM types, the agent (a) draws a user-flow diagram next to the prose, (b) posts reviewer-style comments tied to specific quotes, and (c) on demand emits an engineering-ready Spec Card. **It is not a chatbot** — the agent reacts to writing, not to questions.

### Three-pane layout (all visible simultaneously)

- **LEFT (50%)** — PRD editor (TipTap, Notion-style: heading/paragraph/list only).
- **RIGHT-TOP (~60% height)** — Live flow diagram (ReactFlow with custom node component, streamed via A2UI).
- **RIGHT-BOTTOM (~40%)** — Reviewer comment cards stacked, then a "resolved" row below. Action bar above the canvas: *Generate engineering handoff* button + `resolved N/M` counter.

### Generative-UI surface mapping (from the kit's spectrum)

The kit exposes three tiers; Pair-PM uses two of them:
- **Controlled (`useComponent`)** — Comment Card and Spec Card. Predefined React components, agent supplies props.
- **Declarative (A2UI)** — flow-diagram nodes/edges, streamed.
- Open-ended (raw HTML / MCP Apps) — not used.

## Stack

- Framework: Next.js (kit default)
- Editor: TipTap (heading/paragraph/list only)
- Diagram: ReactFlow with a custom node component (don't ship a force-directed layout — horizontal/branching tree only)
- Agent surface: CopilotKit, `useComponent` for cards
- Streaming: A2UI for diagram nodes/edges
- Agent runtime: LangGraph Deep Agent in `apps/agent/`. Default LLM: `gemini-3.1-flash-lite` (configured in `apps/agent/src/runtime.py` → `_gemini_llm`). Swapping to Claude Sonnet is one line — see `dev-docs/model-switching.md`.
- Persistence: kit's Postgres-backed threads
- MCP: disabled by default for the Pair-PM demo

## Core architectural invariants

These are load-bearing for the demo. If broken, the "agent is drawing while I type" effect collapses:

1. **Stable node IDs across updates.** The agent emits the *full* `PairPMState` each tick; the frontend diffs by `id` and animates only changes. New paragraphs add new nodes — existing nodes are never recreated. Test this in Hour 1, not Hour 3.
2. **Editor → agent is debounced, not streamed.** Push doc content to the agent on TipTap blur or every 2 seconds. Live-typing streaming is explicitly out of scope — debounced is smoother for the demo and easier to build.
3. **Additive diagram growth.** New paragraphs sprout new branches; existing layout stays put.
4. **Comments quote exact prose.** Every comment carries a verbatim `quote` and (when possible) a `relatedNodeId` that pulses yellow on hover. Vague comments ("consider edge cases") are explicitly disallowed by the agent prompt.
5. **JSON-schema-validate the agent output; on parse failure retain previous state.** Never crash the UI mid-demo.
6. **1.5-second delay** between agent emitting a comment and the card fading in — makes the reviewer feel like it's thinking rather than canned. Perceived-quality detail.

## Data model (`PairPMState`)

The agent emits this shape on every update — full state, not diffs:

```ts
interface PairPMState {
  flowDiagram: {
    nodes: Array<{
      id: string;             // stable across updates — used for diffing
      label: string;
      type: "action" | "decision" | "endpoint" | "empty_state";
      sourceQuote: string;    // prose snippet that justified this node
      highlight?: "yellow" | "green" | null;
    }>;
    edges: Array<{ from: string; to: string; label?: string }>;
  };
  comments: Array<{
    id: string;
    quote: string;            // exact prose excerpt
    question: string;
    relatedNodeId?: string;
    status: "open" | "resolved";
  }>;
  specCard?: {                // populated only when "Generate handoff" is clicked
    refinedPRD: string;
    acceptanceCriteria: string[];          // Given/When/Then format, 3–5 entries
    resolvedQuestions: Array<{ q: string; a: string }>;
  };
}
```

When the doc is empty, the agent emits empty arrays — never placeholder content.

## Agent prompt

The Pair-PM system prompt (in section 5 of `pair-pm-spec.pdf`) replaces the leads-related prompt in `apps/agent/src/runtime.py`. Three responsibilities, in order: maintain flow diagram, post reviewer comments tied to exact quotes, and (on request) emit the spec card with refined PRD + Given/When/Then acceptance criteria + resolved questions.

## Demo (locked)

The demo PRD is **"Date-range filtering for analytics dashboard"** with a fixed paragraph progression (frames 1–7 in spec section 3). Type the same paragraphs you tested with — don't ad-lib on stage. The wow moment is 0:15–0:23: the first 5 nodes drawing themselves into existence after the first paragraph lands.

## Pre-installed agent skills

The kit ships skills for Cursor, Claude Code, and any AGENTS.md-aware tool under `.claude/skills/`, `.cursor/skills/`, and `.agent/skills/`. They cover CopilotKit v2 (`copilotkit-{setup, develop, integrations, debug, upgrade, contribute, agui, self-update}`) and MCP authoring (`mcp-builder`, `mcp-apps-builder`, `chatgpt-app-builder`). Use them when working in the corresponding subsystem rather than re-deriving conventions.

To refresh the CopilotKit skills: `npx skills add copilotkit/skills --full-depth -y`.

There's also a hosted CopilotKit docs MCP at `https://mcp.copilotkit.ai/mcp` if you want live access to upstream reference material.

## Risks the spec calls out (and the planned mitigations)

- Diagram redraws from scratch → flicker. Mitigation: stable IDs (above).
- Live demo breaks on stage. Mitigation: record the fallback video at the *start* of Hour 3, not the end.
- Pre-scripted feel. Mitigation: rehearse the cadence; the agent's reactions should feel emergent but be reliably triggered.
