# Pair-PM — Generative UI Global Hackathon submission

> **Pair-PM is a senior PM that lives inside your spec doc.**
> Not a chatbot you ask. A reviewer who's already in the doc.

## The pitch

PMs don't have a writing problem. They have a peer-review-while-writing problem — engineers read a PRD, immediately spot three questions the spec didn't answer, and the PM finds out at standup the next morning.

Pair-PM puts the senior reviewer next to every PM. As you type, three live surfaces update side-by-side:

- **A flow diagram** of the user journey, drawn from the prose
- **Reviewer comments** flagging ambiguities and missing edge cases — each tied to a specific quote
- **A spec card** on demand, with a refined PRD plus Given/When/Then acceptance criteria

Same six minutes of writing. Engineering-ready output.

## The 90-second demo

A PM opens an empty PRD titled *"Date-range filtering for analytics dashboard"* and starts typing.

As the first paragraph lands, a 5-node flow appears on the right, animated left-to-right:
`[User on dashboard] → [Opens filter] → [Picks start date] → [Picks end date] → [Reruns query]`

This is the wow moment — **the agent draws while the PM types**, not after a button click, not after a question.

The PM keeps going. The diagram grows additively (existing nodes stay put; new branches sprout for region grouping). Comments fade in, each quoting the prose verbatim:
- *On "filter their data by a custom date range":* "What's the max range — 30 days, 1 year, all-time?"
- *On "group results by region":* "What if a region has no data — hide it, show a placeholder, or fall back?"

The PM addresses each by typing answers into the doc. Comments turn green and slide to a "resolved" row as the prose answers them.

One click on **Generate engineering handoff** — the diagram slides aside, replaced by a spec card with the cleaned-up PRD, three Given/When/Then acceptance criteria, and the resolved Q&A pairs. Copy-as-Linear-ticket button is right there.

## Why this isn't a chatbot

The agent never waits for a question. It watches as you write, draws what your prose implies, and surfaces gaps as comments tied to specific quotes. The interaction is **pair-editing, not chat**.

The structural difference: a chatbot's surface is a single message thread. Pair-PM's surface is the doc itself plus two reactive panels. There's no "you ask, it answers" — there's "you write, it reviews."

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (Turbopack) |
| Editor | TipTap (Notion-style, heading/paragraph/list) |
| Diagram | ReactFlow with custom nodes + Framer Motion |
| Agent surface | CopilotKit — `useComponent` for Comment + Spec Cards, shared state for the diagram |
| Agent runtime | LangGraph Deep Agents (Python) |
| LLM | Gemini 3.1 Flash-Lite |
| Persistence | Postgres-backed CopilotKit threads |

**Generative-UI tiers used:** Controlled (`useComponent` for cards) and CopilotKit shared state (for the diagram). We deliberately render the diagram with ReactFlow directly rather than A2UI's renderer catalog — A2UI shines when an agent picks from many UI shapes; Pair-PM has one custom shape.

## The architectural detail that makes the demo feel alive

The agent emits the **full** `PairPMState` JSON on every update — never diffs. The frontend memoizes nodes by stable id and animates only what changed. New paragraphs add new nodes (n6, n7, …) without touching existing ones. This is what makes the diagram look additive instead of redrawing on every tick.

## Run it

```bash
git clone https://github.com/ritunjaym/Generative-UI-Global-Hackathon-Starter-Kit.git
cd Generative-UI-Global-Hackathon-Starter-Kit
git checkout pair-pm
npm install
cp .env.example .env && cp apps/agent/.env.example apps/agent/.env
# Fill in GEMINI_API_KEY (https://aistudio.google.com) and
# COPILOTKIT_LICENSE_TOKEN (`npx copilotkit@latest license`)
# in both .env files. Notion vars stay empty.
npm run dev
# Open http://localhost:3010
```

Docker Desktop must be running (the kit boots Postgres + Redis + CopilotKit Intelligence via docker-compose).

## Built for the Generative UI Global Hackathon — May 9, 2026

Built on the [Agentic Interfaces Starter Kit](https://github.com/jerelvelarde/Generative-UI-Global-Hackathon-Starter-Kit). MIT.
