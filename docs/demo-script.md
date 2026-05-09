# Pair-PM demo script

Locked verbatim from `docs/pair-pm-spec.pdf` section 3. **Do not ad-lib in the recording.** Both Person A (UI fixtures) and Person B (agent prompt rehearsal) test against these exact paragraphs.

---

## Demo PRD title

> **PRD: Date-range filtering for analytics dashboard**

The PM types this title into the editor first, then waits a beat before paragraph 1.

---

## Paragraph 1 (T+0:15)

> Users on the analytics dashboard need to filter their data by a custom date range. Today, they can only choose preset windows (7, 30, 90 days). The new flow lets them pick a start date and end date and re-run the query.

**Expected agent output (5 nodes, animated left-to-right, 200ms stagger):**

```
[User on dashboard] → [Opens filter] → [Picks start date] → [Picks end date] → [Reruns query]
```

**Comments:** none yet.
**Spec card:** none yet.

**This is THE WOW MOMENT** — 0:15 to 0:23 of the demo. Audience sees 5 nodes drawing themselves into existence as the agent reads the prose.

---

## Paragraph 2 (T+0:35)

> Users should also be able to group results by region. The combination of date range and region grouping should update the chart in real time.

**Expected agent output:**
- Diagram grows additively — new branch sprouts off the existing nodes for region grouping. **Existing 5 nodes do NOT move.**
- First comment card fades in (1.5s after agent decides — perceived "thinking" delay):
  > 💬 **Pair-PM** _Quoted: "filter their data by a custom date range"_
  > **What's the max range allowed?** 30 days, 1 year, all-time? And is the picker a single calendar or two separate pickers? `[Mark resolved]`

---

## Paragraph 3 (T+0:55)

> Date range is capped at 1 year. Use a two-pane calendar picker (start + end).

**Expected agent output:**
- Comment 1 turns green-bordered, slides up to a "resolved" row. Counter: **"1 of 1 resolved."**
- Then comment 2 fades in:
  > 💬 **Pair-PM** _Quoted: "group results by region"_
  > **What if a region has no data in the selected range?** The flow doesn't handle empty state — hide the region, show a placeholder, or fall back to a wider window? `[Mark resolved]`
- The "Selects region grouping?" node briefly pulses yellow — tying the comment to the node it concerns.

---

## Paragraph 4 (T+1:15)

> Empty state: regions with zero data in the range show a 'no data' placeholder, not hidden.

**Expected agent output:**
- Diagram grows — the yellow node sprouts a new branch for empty state. Yellow clears.
- Comment 2 turns green-bordered, slides to resolved. Counter: **"2 of 2 resolved."**

---

## Frame 5 — Generate handoff (T+1:30)

PM clicks **"Generate engineering handoff."**

**Expected:** flow diagram is replaced (slide animation, Framer Motion `AnimatePresence`) by a **Spec Card** containing:

- **Refined PRD** (cleaned-up version of all four paragraphs)
- **Embedded mini-flow diagram** (read-only, no animations)
- **Resolved questions list:**
  - Max range: 1 year ✓
  - Empty state: placeholder ✓
- **Auto-extracted acceptance criteria (Given/When/Then format, 3–4 of them)**, e.g.:
  > **Given** a user is on the analytics dashboard
  > **When** they select a start date and end date within a 1-year window
  > **Then** the query reruns and the chart updates
- `[Copy as Linear ticket]` button

---

## Closer (T+1:45)

> "PMs don't have a writing problem. They have a peer-review-while-writing problem. We made the senior PM available to every PM — watching every doc, drawing what's implicit, asking what's missing. Same six minutes of writing. Engineering-ready output."

---

## Typing cadence

- T+0:00 — type the title, pause 2s
- T+0:15 — type paragraph 1 (~10 seconds of typing, ~3 seconds for diagram to draw)
- T+0:35 — type paragraph 2
- T+0:55 — type paragraph 3
- T+1:15 — type paragraph 4
- T+1:30 — click "Generate engineering handoff"
- T+1:45 — closer line

Total demo runtime: **~1:45**. Leaves 15 seconds slack in the 2:00 hackathon slot.

## Rehearsal note

Type at a *slightly slower than natural* pace. The 2-second debounce means too-fast typing skips the in-between agent runs that make the diagram feel reactive. Aim for ~80 words per minute, not your natural 120.
