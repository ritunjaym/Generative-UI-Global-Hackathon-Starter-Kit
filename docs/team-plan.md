# Pair-PM team plan

**Hackathon date:** 2026-05-09
**Time budget:** 2.5 hours
**Team:** 3 people
**Branch:** `pair-pm` (everyone works here, no sub-branches)
**Spec:** [`docs/pair-pm-spec.pdf`](pair-pm-spec.pdf)

---

## Quick orient

**What we're building.** Pair-PM is a senior-PM agent that lives inside a PRD doc. As the PM types, the agent draws a flow diagram beside them, posts reviewer comments tied to specific quotes, and on demand emits an engineering-ready Spec Card. Three panes, all updating live. Read spec sections 1–3 for the 90-second demo, section 6 for the components.

**Stack (locked).**
- **Frontend:** Next.js + TipTap + ReactFlow + Framer Motion + CopilotKit (`useComponent` for cards, shared state for diagram).
- **Backend:** LangGraph Deep Agents in `apps/agent/`, `AGENT_RUNTIME=gemini-flash-deep`, Gemini 3.1 Flash-Lite.
- **Skipped:** MCP, Notion, A2UI for the diagram (we render with ReactFlow ourselves), LangSmith, Daytona.

**Integration contract.** The `PairPMState` JSON shape (spec section 4). TypeScript types in [`apps/frontend/src/lib/pair-pm/types.ts`](../apps/frontend/src/lib/pair-pm/types.ts) (already scaffolded). Python TypedDict equivalent in [`apps/agent/src/pair_pm_state.py`](../apps/agent/src/pair_pm_state.py) (already scaffolded). **Field names match verbatim from the spec — no variations.**

**Three-way ownership.**
- **Person A — Frontend.** Owns `apps/frontend/`. Doesn't touch `apps/agent/`.
- **Person B — Backend "brain" (Aman).** Owns the prompt + fixtures + demo content. WHAT the agent says.
- **Person C — Backend "body".** Owns the runtime + middleware + validation. HOW the agent runs.

Persons B and C both work in `apps/agent/` but on **different files** — there shouldn't be merge conflicts.

---

## Together first (0:00 – 0:15)

Before anyone starts solo work:

1. All: `npm install` then `npm run dev` — confirm it boots locally (Docker must be running)
2. All: review the integration contract in [`apps/frontend/src/lib/pair-pm/types.ts`](../apps/frontend/src/lib/pair-pm/types.ts) and [`apps/agent/src/pair_pm_state.py`](../apps/agent/src/pair_pm_state.py) — already scaffolded; flag any field mismatches now
3. All: skim [`docs/demo-script.md`](demo-script.md) — the exact paragraphs we all test against

After this everyone works in parallel. No more cross-talk needed until 0:45.

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

#### 2. Flow Diagram — right-top pane (~60% height)
- **Files:** `apps/frontend/src/components/FlowDiagram.tsx`, `FlowNode.tsx`
- **Library:** ReactFlow + Framer Motion
- **Stable-ID diff (load-bearing — Risk 1 in spec):** memoize previous nodes by `id`; new IDs animate in, existing IDs stay put. **Test by alternating `paragraph-1.json` ↔ `paragraph-2.json` fixtures — must animate additively, not flicker.**
- **Animations:** new nodes = 200ms staggered fade+slide, yellow pulse on hovered comment's `relatedNodeId`, 400ms green flash on node add

#### 3. Comment Card — right-bottom (`useComponent`)
- **File:** `apps/frontend/src/components/CommentCard.tsx`
- **Props:** `id`, `quote`, `question`, `relatedNodeId?`, `status`, `onResolve`
- **States:** `open` (default border) → `resolved` (green border, 60% opacity, slides to "resolved" row)
- **Hover:** fires yellow pulse on the linked node

#### 4. Spec Card — replaces flow diagram on handoff (`useComponent`)
- **File:** `apps/frontend/src/components/SpecCard.tsx`
- **Sections:** refined PRD (markdown) → mini diagram (read-only) → acceptance criteria (Given/When/Then, mono) → resolved Q/A pairs → "Copy as Linear ticket" button (formats as Markdown, `navigator.clipboard.writeText`)
- **Trigger:** when `state.specCard !== null`, slide in from right via Framer Motion `AnimatePresence`

#### 5. Layout + Action Bar
- **File:** `apps/frontend/src/app/page.tsx`
- 50/50 horizontal, right column 60/40 vertical. Action bar above right column: "Generate engineering handoff" button + "Resolved N/M" counter.

### Hour-by-hour for Person A

| Time | Task | Done when |
|---|---|---|
| 0:00–0:15 | Together: env setup, schema review, demo script | `npm run dev` boots |
| 0:15–0:45 | TipTap editor + 2s debounce + `console.log` push | Typing → content logged |
| 0:45–1:15 | ReactFlow with `paragraph-1.json` fixture, custom node component | 5 nodes render left-to-right |
| 1:15–1:35 | Stable-ID diff + animations | Toggling fixtures animates additively |
| 1:35–1:50 | Wire CopilotKit shared state (replace fixture import) | Live agent output renders |
| 1:50–2:10 | Comment Card + resolve flow | Cards render, hover pulses node, resolve moves card |
| 2:10–2:25 | Spec Card + handoff trigger + copy button | Generate handoff swaps in card |
| 2:25–2:30 | Polish + final layout | Visual matches spec section 2 |

---

## Person B — Backend "brain" (Aman)

**Folder you own:** `apps/agent/src/prompts.py` + `apps/agent/fixtures/` + `docs/`. Coordinate with Person C on prompt-loading wiring at 0:30.

### Deliverables

#### 1. Pair-PM agent prompt
- **File:** `apps/agent/src/prompts.py`
- **Action:** replace `LEAD_TRIAGE_PROMPT` + `INTEGRATION_PROMPT` with `PAIR_PM_PROMPT` (drafted; ready to paste). Update `SYSTEM_PROMPT` constant. Remove `build_system_prompt()` integration-status template — no integration block needed.
- **The prompt encodes:**
  - Three responsibilities (flow diagram, reviewer comments, spec card on `requestSpecCard=true`)
  - Stable IDs (`n1` stays `n1` forever — load-bearing for the additive diagram)
  - Verbatim quoting (no paraphrase)
  - One specific question per comment; banned vague phrases
  - Empty doc → empty arrays, not placeholders
  - Full state every tick

#### 2. Demo fixtures — **UNBLOCKER for Person A, must land by 0:45**
- **Folder:** `apps/agent/fixtures/`
- **Files:**
  - `paragraph-1.json` — 5 nodes, no comments, no specCard
  - `paragraph-2.json` — same n1–n5 + new branch nodes + 1 open comment
  - `paragraph-3-with-resolution.json` — comment 1 status=resolved, comment 2 added
  - `with-spec-card.json` — full state including populated specCard
- **Rule:** stable IDs across all files (`n1` in paragraph-1 IS `n1` in paragraph-2)

#### 3. Prompt iteration / quality testing
- After Person C's runtime is wired (0:30), curl the agent at `:8133` with each demo paragraph; verify output matches the corresponding fixture
- Iterate prompt to fix: paraphrased quotes, regenerated IDs, vague comments, off-spec node types
- This is the highest-leverage demo-quality work — own this end-to-end

### Hour-by-hour for Person B

| Time | Task | Done when |
|---|---|---|
| 0:00–0:15 | Together: env setup, schema review | Stack boots |
| 0:15–0:30 | Paste `PAIR_PM_PROMPT` into `prompts.py`, wire `SYSTEM_PROMPT` constant | `prompts.py` compiles, no leads references left |
| 0:30–0:45 | Author all 4 fixture JSONs by hand (use spec frames 2–6 as ground truth) | All fixtures committed and pushed |
| 0:45–1:30 | Test prompt against demo paragraphs; iterate | All 5 paragraphs produce stable, quote-correct output |
| 1:30–1:50 | Edge-case prompt tuning (resolution detection, empty doc, specCard trigger) | All edge cases match expected fixtures |
| 1:50–2:00 | Drafting submission text (works while Person C finalizes validator) | First-pass submission draft in `docs/submission.md` |
| 2:00–2:15 | **Together: end-to-end smoke test** | Real agent → real UI works for full demo |
| 2:15–2:25 | **Type the demo paragraphs while Person C records the fallback video** | MP4 captured at `docs/fallback-demo.mp4` |
| 2:25–2:30 | Final submission text + push | Submission ready |

---

## Person C — Backend "body" (3rd teammate)

**Folder you own:** `apps/agent/src/runtime.py` + `apps/agent/src/pair_pm_middleware.py` (NEW) + `apps/agent/src/state_validator.py` (NEW). **Don't touch `prompts.py` or `fixtures/`** — those are Person B's.

### Why this exists (read first)

The kit's `apps/agent/src/lead_state.py` declares lead-canvas fields on the agent's TypedDict state schema so they survive `STATE_SNAPSHOT` round-trips between agent and frontend. Without this, every state field except `messages` gets wiped when CopilotKit serializes state.

You're writing the **Pair-PM equivalent** — same job, different fields. Use `lead_state.py` as the reference template; mirror its structure.

### Deliverables

#### 1. PairPMStateMiddleware (NEW)
- **File:** `apps/agent/src/pair_pm_middleware.py`
- **Reference:** `apps/agent/src/lead_state.py` — copy its structure
- **Job:** declare `flowDiagram`, `comments`, `specCard`, `docContent`, `requestSpecCard` on the agent's TypedDict state schema so they survive STATE_SNAPSHOTs
- **Source of truth for field shapes:** `apps/agent/src/pair_pm_state.py` (already scaffolded — import the TypedDicts from there)
- **Hydration:** on first turn, populate from `EMPTY_STATE` (no external store, unlike leads)

#### 2. Runtime wiring (modify)
- **File:** `apps/agent/src/runtime.py`
- **Action:** swap line 84 — replace `LeadStateMiddleware` with `PairPMStateMiddleware` in the middleware chain
- Keep `TimingMiddleware` and `CopilotKitMiddleware` unchanged
- Keep all three runtime variants (`gemini-flash-deep`, `gemini-flash-react`, `claude-sonnet-4-6-react`)
- The `system_prompt` arg comes from `prompts.SYSTEM_PROMPT` (Person B's deliverable) — your code imports it; don't edit the prompt text

#### 3. JSON state validator (NEW)
- **File:** `apps/agent/src/state_validator.py`
- **Job:** wrap agent output. Parse → validate against `PairPMState` shape → return new state OR previous state on failure
- **Critical:** never crash the UI mid-demo (Risk 4 in spec). Log validation failures to stdout but always return a valid state to CopilotKit.
- **Hook point:** wherever the agent's structured output gets written into shared state — wrap that step

#### 4. main.py / graph wiring
- **File:** `apps/agent/main.py` (or wherever `build_graph()` is called)
- Confirm the new middleware composes; the LangGraph CLI (`langgraph dev`) reloads on changes — watch the agent terminal for import errors

### Hour-by-hour for Person C

| Time | Task | Done when |
|---|---|---|
| 0:00–0:15 | Together: env setup, schema review | Stack boots; you've read `lead_state.py` |
| 0:15–0:45 | Write `pair_pm_middleware.py` mirroring `lead_state.py` | Imports without error; declares all 5 state fields |
| 0:45–1:00 | Swap middleware in `runtime.py`; restart agent | Agent boots clean on `:8133`; no lead references in cold path |
| 1:00–1:15 | Curl `:8133` with empty `docContent` — verify state shape returns | Empty state round-trips correctly |
| 1:15–1:30 | Wire structured output target (`PairPMState`) on the LLM call | First real run with Person B's prompt produces valid JSON |
| 1:30–1:50 | JSON validator wrapper + retain-previous-state on parse failure | Malformed output retains last good state |
| 1:50–2:00 | Help Person B test paragraphs 2–5 if they're hitting issues | Spare-cycles support |
| 2:00–2:15 | **Together: end-to-end smoke test** | Real agent → real UI works |
| 2:15–2:25 | **Record fallback video** (Person B types the paragraphs, Person A's UI renders, you screen-record) | MP4 saved at `docs/fallback-demo.mp4` |
| 2:25–2:30 | README update — replace kit's leads description with Pair-PM | README reflects the build |

### What will block you if not nailed early
- **Middleware schema mismatch.** If your TypedDict fields don't match `pair_pm_state.py` exactly, STATE_SNAPSHOTs will silently drop fields. Field-name parity is everything. `langgraph dev` doesn't always surface this clearly — diff against `pair_pm_state.py` line-by-line.

---

## Coordination rules

- All three push directly to `pair-pm`. `git pull --rebase` before every push.
- **0:30 checkpoint** (B↔C): Person C reports runtime wiring done; Person B starts curling the live agent with demo paragraphs.
- **0:45 checkpoint** (B↔A): Person B's fixtures are in `apps/agent/fixtures/`; Person A confirms they import and render.
- **1:00 checkpoint** (B↔C): Person B reports first paragraph producing matching output; Person C confirms validator catches malformed output.
- **2:00 sync** (all three): stop solo work, do end-to-end smoke test together.
- **2:15 split:** B types, C records, A polishes. (See per-person tables.)
- **Last 5 minutes:** stop coding. Final demo recording. Submit.

## Escape hatch

If Gemini Flash-Lite misbehaves on stable IDs or exact quoting at the 2:00 smoke test:
1. Get an Anthropic API key (`ANTHROPIC_API_KEY`)
2. Edit `apps/agent/.env`: `AGENT_RUNTIME=claude-sonnet-4-6-react`
3. Restart `npm run dev:agent`

## What NOT to do

- Don't ad-lib in the demo recording. Type the paragraphs in `docs/demo-script.md` verbatim.
- Don't add "live typing streaming" — debounced is the spec.
- Don't wire MCP/Notion. Skipped.
- Don't redesign the layout. 50/50 + 60/40 is locked.
- Don't add features beyond the four components in spec section 6.
- **Person B and C: don't touch each other's files.** B owns prompt + fixtures; C owns runtime + middleware + validator. Both work in `apps/agent/` but on disjoint paths.

## The wow moment to protect

0:15–0:23 of the demo: the first 5 nodes drawing themselves into existence after the first paragraph lands. Everything in this plan is in service of that 8 seconds.
