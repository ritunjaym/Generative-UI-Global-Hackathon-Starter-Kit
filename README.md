# Pair-PM

> **A senior PM that lives inside your spec doc.**
> Not a chatbot you ask. A reviewer who's already in the doc.

![Hackathon Banner](apps/frontend/public/banner.jpg)

Submission for the **Generative UI Global Hackathon: Agentic Interfaces** — May 9, 2026. Built on the [CopilotKit Agentic Interfaces Starter Kit](https://github.com/CopilotKit/Generative-UI-Global-Hackathon-Starter-Kit).

**Tracks:** *The Copilot That Ships* (primary) · *Kill the Dashboard* (secondary).

---

## The pitch

PMs don't have a writing problem — they have a **peer-review-while-writing** problem. Engineers read a draft PRD, immediately spot three questions the spec didn't answer, and the PM finds out at standup the next morning.

Today's AI tools don't fix this. You hand vague requirements to a chatbot, get a polished PRD back, and walk into the meeting clueless about your own doc. Comprehension was outsourced.

**Pair-PM puts the senior reviewer next to every PM.** As you type, three live UI surfaces update side-by-side:

- **A flow diagram** of the user journey, drawn from the prose at runtime
- **Inline reviewer comments** flagging ambiguities and missing edge cases — each tied to a specific verbatim quote, anchored to the node it questions
- **A spec card on demand**, with a refined PRD and Given/When/Then acceptance criteria

The agent never waits for a question. It watches as you write, draws what your prose implies, and surfaces gaps as comments tied to specific spans. Same six minutes of writing. Engineering-ready output.

---

## The 90-second demo

A PM opens an empty PRD titled *"Date-range filtering for analytics dashboard"* and starts typing.

As the first paragraph lands, a 5-node flow appears on the right, animated left-to-right:

`[User on dashboard] → [Opens filter] → [Picks start date] → [Picks end date] → [Reruns query]`

**This is the wow moment** — *the agent draws while the PM types*, not after a button click, not after a question.

The PM keeps going. The diagram grows additively (existing nodes stay put; new branches sprout for region grouping). Comments fade in 1.5 seconds after each paragraph, each quoting the prose verbatim:

- *On "filter their data by a custom date range":* "What's the max range — 30 days, 1 year, all-time?"
- *On "group results by region":* "What if a region has no data — hide it, show a placeholder, or fall back?"

The PM addresses each by typing answers into the doc. Comments turn green and slide to a "resolved" row as the prose answers them.

One click on **Generate engineering handoff** — the diagram slides aside, replaced by a spec card with the cleaned-up PRD, three Given/When/Then acceptance criteria, and the resolved Q&A pairs. Copy-as-Linear-ticket button is right there.

---

## Why this isn't a chatbot

The hackathon's gating question is: *"Would this have been impossible with a chat interface?"* Three structural answers:

1. **No turn-taking.** A chatbot is request/response — you write, you wait, you read. Pair-PM runs in parallel: the PM never pauses, the agent never replies in text. Output is *new UI surfaces appearing in the workspace*, regenerated as the input mutates.
2. **No single message thread.** A chat interface has one surface — a bubble. Pair-PM has three independent runtime-rendered surfaces (flow diagram, inline comments, spec card), each anchored to specific spans of the user's prose. A chat thread can't render a diagram beside the message that justified it, anchor a comment to a quote in a different surface, or compile a structured handoff from session state.
3. **Comprehension, not composition.** A chatbot writes *for* you. Pair-PM finishes the thinking *with* you. The diagram is the agent's mental model, made visible. The comments are gaps it caught that you didn't. The handoff is the doc you understood as you wrote it. The user retains authorship because the agent's reasoning is rendered, not buried in prose.

---

## Generative-UI tier mapping

CopilotKit's generative UI spectrum: **Controlled** → **Declarative** → **Open-ended**. Pair-PM uses one and a half tiers:

| Surface | Tier | Mechanism |
|---|---|---|
| **Comment Cards** | Controlled (`useComponent`) | Predefined React component; agent supplies props |
| **Spec Card** | Controlled (`useComponent`) | Predefined React component; agent supplies props |
| **Flow Diagram** | CopilotKit shared state (`useCoAgent`) | Agent writes `PairPMState` to shared state; ReactFlow renders directly with a custom node component |

We deliberately render the diagram with ReactFlow rather than A2UI's renderer catalog. A2UI shines when the agent picks from many UI shapes; Pair-PM has one custom shape that we want pixel-perfect. Open-ended (raw HTML / MCP Apps) is not used.

---

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 15 (Turbopack) |
| Editor | TipTap (Notion-style — heading / paragraph / list only) |
| Diagram | ReactFlow with custom node component |
| Animation | Framer Motion (200ms stagger fade-in, yellow pulse, green flash on resolve) |
| Agent surface | **CopilotKit** — `useComponent` for cards, shared state for the diagram |
| Agent runtime | **LangGraph Deep Agents** (Python, on `:8133`) — `AGENT_RUNTIME=gemini-flash-deep` (with `claude-sonnet-4-6-react` fallback) |
| LLM | **Gemini 3.1 Flash-Lite** (default); Claude Sonnet 4.6 escape hatch |
| Persistence | Postgres + Redis via the kit's `docker-compose` (CopilotKit Intelligence threads) |
| Skipped (deliberately) | A2UI for the diagram, MCP, Notion, Daytona, LangSmith |

**Protocols used:** CopilotKit (`useComponent`, `useCoAgent` shared state), LangGraph (Deep Agents), Gemini API.

---

## The architectural detail that makes the demo feel alive

The agent emits the **full `PairPMState` JSON on every update — never diffs.** The frontend memoizes nodes by stable id and animates only what changed. New paragraphs add new nodes (`n6`, `n7`, …) without ever touching existing ones — which is what makes the diagram look additive instead of redrawing on every tick.

Six load-bearing invariants from the spec:

1. **Stable node IDs across updates.** Test in Hour 1, not Hour 3.
2. **Editor → agent is debounced, not streamed.** Push doc content on TipTap blur or every 2 seconds. Live-typing streaming is explicitly out of scope.
3. **Additive diagram growth.** New paragraphs sprout new branches; existing layout stays put.
4. **Comments quote exact prose.** Every comment carries a verbatim `quote` and (when possible) a `relatedNodeId` that pulses yellow on hover. Vague comments ("consider edge cases") are banned by the prompt.
5. **JSON-schema-validate the agent output; on parse failure retain previous state.** Never crash the UI mid-demo.
6. **1.5s delay** between agent emitting a comment and the card fading in — makes the reviewer feel like it's "thinking" rather than canned.

The integration contract is locked in two scaffolded files (single source of truth):

- TS: [`apps/frontend/src/lib/pair-pm/types.ts`](apps/frontend/src/lib/pair-pm/types.ts)
- Python: [`apps/agent/src/pair_pm_state.py`](apps/agent/src/pair_pm_state.py)

Field names match verbatim from spec section 4.

---

## Run it locally

You need Node 20+, Python 3.10+, [`uv`](https://docs.astral.sh/uv/), and **Docker Desktop running**.

```bash
git clone https://github.com/ritunjaym/Generative-UI-Global-Hackathon-Starter-Kit.git
cd Generative-UI-Global-Hackathon-Starter-Kit
git checkout pair-pm

# 1. Install (npm postinstall runs uv sync for the Python agent)
npm install

# 2. Env templates
cp .env.example .env
cp apps/agent/.env.example apps/agent/.env

# 3. Add credentials to BOTH .env files:
#    GEMINI_API_KEY=...           (https://aistudio.google.com)
#    COPILOTKIT_LICENSE_TOKEN=... (npx copilotkit@latest license)
#    Notion vars stay empty — SKIP_NOTION_CHECK=1 is pre-set on this branch.

# 4. Boot everything (Postgres + Redis + Intelligence + UI + BFF + agent)
npm run dev
# Then open http://localhost:3010
```

`npm run dev` runs a pre-flight check (`scripts/check-env.sh`) before booting. It'll fail loudly with a numbered list if anything's missing. Fix what it lists and re-run.

**To swap Gemini for Claude Sonnet 4.6** (escape hatch when Gemini misbehaves on stable IDs / verbatim quoting): set `AGENT_RUNTIME=claude-sonnet-4-6-react` in `apps/agent/.env` and add `ANTHROPIC_API_KEY`.

**Single workspace dev:** `npm run dev:ui` · `dev:bff` · `dev:agent` · `dev:mcp`. Tear down infra with `npm run dev:infra:down`.

---

## Repo layout

```
apps/
  frontend/      Next.js — PRD editor + flow diagram + comment cards
    src/lib/pair-pm/types.ts        ← TS integration contract
  bff/           backend-for-frontend (CopilotKit runtime bridge)
  agent/         LangGraph Deep Agent (Python, uv) on :8133
    src/pair_pm_state.py            ← Python TypedDict mirror
    src/runtime.py                  ← agent setup + system prompt
    src/pair_pm_middleware.py       ← state-shaping middleware
    src/state_validator.py          ← JSON-schema retain-on-parse-fail
  mcp/           deployable MCP server (mcp-use, not used for Pair-PM)
deployment/      docker-compose.yml — Postgres + Redis + Intelligence
docs/
  pair-pm-spec.pdf                  ← product behavior spec (source of truth)
  team-plan.md                      ← 2.5-hour build plan
  demo-script.md                    ← locked demo paragraphs
  submission.md                     ← hackathon-form pitch
scripts/         check-env.sh (patched), seed-default-user.sh
```

The kit's example product (Notion "Leads" canvas) has been **replaced** for Pair-PM. The leads-related agent prompt + frontend cards are swapped out; the kit's plumbing (CopilotKit runtime, Postgres threads, LangGraph agent harness) stays.

---

## Team

- **Aman** — PM. Owns the system prompt, demo content, and the lived experience the cold open is based on.
- **Kaden** — Biomedical ML researcher building new model architectures from scratch. Owns the technical thesis and the Pair-PM agent persona.
- **JS** — Engineer working on agentic workflow engines. Owns the runtime, middleware, and the receiving-end of the engineering handoff.

---

## Built for the Generative UI Global Hackathon — May 9, 2026

Built on the [CopilotKit Agentic Interfaces Starter Kit](https://github.com/CopilotKit/Generative-UI-Global-Hackathon-Starter-Kit). License: MIT.

> *"We didn't wrap a chatbot. We replaced it."*
