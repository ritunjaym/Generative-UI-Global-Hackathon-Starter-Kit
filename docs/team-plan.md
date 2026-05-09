# Pair-PM team plan

**Hackathon date:** 2026-05-09
**Time budget:** 2.5 hours
**Team:** 2 people
**Branch:** `pair-pm` (everyone works here, no sub-branches)
**Spec:** [`docs/pair-pm-spec.pdf`](pair-pm-spec.pdf)

---

## Quick orient

**What we're building.** Pair-PM is a senior-PM agent that lives inside a PRD doc. As the PM types, the agent draws a flow diagram beside them, posts reviewer comments tied to specific quotes, and on demand emits an engineering-ready Spec Card. Three panes, all updating live. Read spec sections 1–3 for the 90-second demo, section 6 for the components.

**Stack (locked).**
- **Frontend:** Next.js + TipTap + ReactFlow + Framer Motion + CopilotKit (`useComponent` for cards, shared state for diagram).
- **Backend:** LangGraph Deep Agents in `apps/agent/`, `AGENT_RUNTIME=gemini-flash-deep`, Gemini 3.1 Flash-Lite.
- **Skipped:** MCP, Notion, A2UI for the diagram (we render with ReactFlow ourselves), LangSmith, Daytona.

**Integration contract.** The `PairPMState` JSON shape (spec section 4). TypeScript types in [`apps/frontend/src/lib/pair-pm/types.ts`](../apps/frontend/src/lib/pair-pm/types.ts) (already scaffolded). Python TypedDict equivalent in [`apps/agent/src/pair_pm_state.py`](../apps/agent/src/pair_pm_state.py) (already scaffolded). **Field names match verbatim from the spec — no variations.** Both files import directly from each other's contracts.

---

## Together first (0:00 – 0:15)

Before either of you starts solo work:

1. Both: `npm install` then `npm run dev` — confirm it boots (Docker must be running)
2. Both: review the integration contract in [`apps/frontend/src/lib/pair-pm/types.ts`](../apps/frontend/src/lib/pair-pm/types.ts) and [`apps/agent/src/pair_pm_state.py`](../apps/agent/src/pair_pm_state.py) — these are already scaffolded; flag any field mismatches before either of you starts
3. Both: skim [`docs/demo-script.md`](demo-script.md) — these are the exact paragraphs we both test against

After this, you both work in parallel. No more cross-talk needed until 1:00.

---

## Person A — Frontend (Teammate)

**Folder you own:** `apps/frontend/` only. Don't touch `apps/agent/`.
**Key dependency:** Person B's fixture JSONs land at 0:45 in `apps/agent/fixtures/`. You import those to develop against.

### Deliverables

#### 1. PRD Editor — left pane (50% width)
- **File:** `apps/frontend/src/components/PRDEditor.tsx`
- **Library:** TipTap with StarterKit, restricted to heading / paragraph / bullet list
- **Behavior:** debounce content changes by 2s OR push on `blur`, whichever comes first
- **Output:** serialized doc text → CopilotKit shared state field `docContent: string`
- **Acceptance:** typing in the editor updates `docContent` after 2s of no edits, no jank

#### 2. Flow Diagram — right-top pane (~60% height)
- **Files:**
  - `apps/frontend/src/components/FlowDiagram.tsx` — main container
  - `apps/frontend/src/components/FlowNode.tsx` — custom node component
- **Library:** ReactFlow (`reactflow` npm)
- **Behavior:** render `state.flowDiagram.nodes` and `.edges` from CopilotKit shared state
- **Stable-ID diff (load-bearing — Risk 1 in spec):**
  - Memoize previous nodes by `id`
  - When a new node ID appears, mark it "new" for one render cycle and animate it in
  - Existing node IDs keep their position — never re-render in place
  - **Test by alternating between `paragraph-1.json` and `paragraph-2.json` fixtures — must animate additively, not flicker**
- **Animations (Framer Motion):**
  - New nodes: 200ms staggered fade + slide-in
  - Yellow pulse: when a comment with matching `relatedNodeId` is hovered (in pane #3)
  - Green flash: 400ms when a node is newly added
- **Acceptance:** loading `paragraph-1.json` shows 5 nodes; switching to `paragraph-2.json` adds new branch *without* moving existing nodes

#### 3. Comment Card — right-bottom pane top (controlled component)
- **File:** `apps/frontend/src/components/CommentCard.tsx`
- **Pattern:** `useComponent` from CopilotKit (controlled — agent supplies props)
- **Props:** `id`, `quote`, `question`, `relatedNodeId?`, `status`, `onResolve`
- **Visuals:**
  - Quote block at top: italic, gray border-left, prefixed with the bubble icon
  - "Pair-PM" sender label
  - Question text
  - "Mark resolved" button
- **States:**
  - `open` — default border
  - `resolved` — green border, 60% opacity, slides down to a "resolved" row below the active stack
- **Hover behavior:** when `relatedNodeId` is set, hover triggers yellow pulse on that node (set `highlight: 'yellow'` on node OR fire shared event)
- **Acceptance:** render 2 cards from a fixture, hover one → see node pulse yellow; click resolve → card moves to resolved row + counter (in action bar) increments

#### 4. Spec Card — replaces flow diagram on handoff (controlled component)
- **File:** `apps/frontend/src/components/SpecCard.tsx`
- **Pattern:** `useComponent`
- **Sections (in order):**
  1. **Refined PRD** — markdown rendered (use `react-markdown`)
  2. **Mini flow diagram** — read-only ReactFlow, no animations
  3. **Acceptance criteria** — Given/When/Then, monospace font
  4. **Resolved questions** — Q/A pairs
  5. **"Copy as Linear ticket" button** — formats whole card as Markdown, writes to clipboard via `navigator.clipboard.writeText()`
- **Trigger:** when `state.specCard !== null`, slide it in from the right *replacing* the flow diagram (Framer Motion `AnimatePresence`)
- **Acceptance:** clicking "Generate engineering handoff" → spec card slides in; copy button puts properly-formatted Markdown into clipboard

#### 5. Layout + Action Bar
- **File:** `apps/frontend/src/app/page.tsx` (or wherever the kit's main canvas page lives)
- **Layout:** 50/50 horizontal split. Right column: 60/40 vertical split.
- **Action bar** above right column: "Generate engineering handoff" button + "Resolved N/M" counter
- **Counter logic:** `${resolved.length} of ${total.length} resolved`

### Hour-by-hour for Person A

| Time | Task | Done when |
|---|---|---|
| 0:00–0:15 | Together: env setup, schema lock, read demo script | `npm run dev` boots locally |
| 0:15–0:45 | TipTap editor in left pane, debounced push to `console.log` | Typing → 2s later see content logged |
| 0:45–1:15 | ReactFlow with `paragraph-1.json` fixture, custom node component | Diagram renders 5 nodes left-to-right |
| 1:15–1:35 | Stable-ID diff + Framer Motion animations | Toggling between fixtures animates additively |
| 1:35–1:50 | Wire CopilotKit shared state (replace fixture import) | Live agent output renders |
| 1:50–2:10 | Comment Card via `useComponent`, render list, resolve flow | Cards appear, hover pulses node, resolve moves card |
| 2:10–2:25 | Spec Card + handoff trigger + copy button | Generate handoff swaps in spec card |
| 2:25–2:30 | Polish + final layout | Visual matches spec section 2 |

### What will block you if not nailed early
- **Stable-ID diff** — get this working with fixtures by 1:30. If it flickers, the demo dies.
- **Framer Motion timing** — 200ms stagger feels right. Longer feels canned, shorter feels chaotic. Tune against the demo paragraphs.

---

## Person B — Backend (Aman)

**Folder I own:** `apps/agent/` only. Don't touch `apps/frontend/`.

### Deliverables

#### 1. Pair-PM agent prompt
- **File:** `apps/agent/src/runtime.py`
- **Action:** replace the existing leads-related system prompt with the Pair-PM prompt from spec section 5
- **Three responsibilities the prompt enforces:**
  1. **Flow diagram** — maintain `flowDiagram.nodes` + `.edges` describing the user journey from the PRD prose
  2. **Reviewer comments** — identify ambiguities and missing edge cases. Each comment: quote exact prose, ask one specific actionable question, tie to a flow node when possible.
  3. **Spec card** — when triggered, emit `specCard` with refined PRD + 3–5 Given/When/Then acceptance criteria + resolved Q&As
- **Style rules baked into prompt:**
  - Senior, calm, specific
  - Never vague ("consider edge cases" — banned)
  - Always quote prose verbatim, not paraphrased
  - Empty doc → emit empty arrays, never placeholder content
  - **Stable IDs across emissions — never regenerate `n1`, `n2`, etc. for the same node**

#### 2. PairPMState TypedDict models
- **File:** `apps/agent/src/pair_pm_state.py` *(scaffolded)*
- Already mirrors `apps/frontend/src/lib/pair-pm/types.ts` field names
- Wire as the agent's structured-output schema (LangChain structured output) — point the model at `PairPMState`

#### 3. JSON-schema validator (retain previous state on parse failure)
- **File:** `apps/agent/src/state_validator.py`
- Wrap agent emissions: parse → validate → return new state OR previous state on failure
- Critical: never crash the UI mid-demo (Risk 4 in spec)

#### 4. Demo fixtures — **UNBLOCKER for Person A, must land by 0:45**
- **Folder:** `apps/agent/fixtures/`
- **Files:**
  - `paragraph-1.json` — state after demo paragraph 1 typed (5 nodes, no comments)
  - `paragraph-2.json` — state after paragraph 2 (adds region branch nodes, 1 comment about max date range)
  - `paragraph-3-with-resolution.json` — state after paragraph 3 (comment 1 marked resolved, comment 2 appears)
  - `with-spec-card.json` — full state with `specCard` populated
- **Rule:** stable IDs across all files (`n1` in paragraph-1 must be the same `n1` in paragraph-2)

#### 5. "Generate handoff" trigger
- Coordinate with Person A: shared state flag `requestSpecCard: boolean`
- When true, agent populates `specCard` on next emission

### Hour-by-hour for Person B

| Time | Task | Done when |
|---|---|---|
| 0:00–0:15 | Together: env setup, schema lock | Schema files written, `npm run dev` boots |
| 0:15–0:45 | Replace leads prompt; agent emits valid JSON for paragraph 1 (curl test or langgraph dev UI) | One-shot agent run produces state matching `paragraph-1.json` |
| 0:45–1:00 | **Commit + push fixture JSONs — UNBLOCKS PERSON A** | All 4 fixture files committed to `pair-pm` |
| 1:00–1:30 | Tune prompt for paragraphs 2–5; verify stable IDs and exact quoting | All 5 paragraphs produce correct stateful output |
| 1:30–1:50 | JSON validator + retain-previous-state wrapper | Malformed output → previous state retained, no crash |
| 1:50–2:00 | Generate handoff path → spec card emission | Agent emits valid `specCard` on request flag |
| 2:00–2:15 | **Together: end-to-end smoke test** | Real agent → real UI works for all 5 paragraphs |
| 2:15–2:25 | Record fallback video (I type, Person A's UI renders) | MP4 saved at `docs/fallback-demo.mp4` |
| 2:25–2:30 | Submission text + README update | README reflects Pair-PM, not the kit's leads demo |

### Escape hatch
If Gemini Flash-Lite misbehaves on stable IDs or exact quoting at the 2:00 smoke test:
- One-line edit in `apps/agent/.env`: `AGENT_RUNTIME=claude-sonnet-4-6-react`
- Add `ANTHROPIC_API_KEY` to `apps/agent/.env`
- Restart agent (`npm run dev:agent`)

---

## Coordination rules

- Both push directly to `pair-pm`. `git pull --rebase` before every push.
- **Comms checkpoint at 0:45**: Person B confirms fixtures are committed; Person A confirms they can render them.
- **2:00 sync**: both stop solo work, do end-to-end smoke test together.
- **2:25 sync**: B records fallback video; A polishes.
- **Last 5 minutes**: stop coding. Final demo recording. Submit.

## What NOT to do

- Don't ad-lib in the demo recording. Type the paragraphs in `docs/demo-script.md` verbatim.
- Don't add "live typing streaming" — debounced is the spec.
- Don't wire MCP/Notion. Skipped.
- Don't redesign the layout. 50/50 + 60/40 is locked.
- Don't add features beyond the four components in spec section 6.

## The wow moment to protect

0:15–0:23 of the demo: the first 5 nodes drawing themselves into existence after the first paragraph lands. Everything in this plan is in service of that 8 seconds.
