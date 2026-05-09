"""PairPMState — the integration contract between the Pair-PM agent and UI.

Field names locked by docs/pair-pm-spec.pdf section 4 — DO NOT rename
without updating apps/frontend/src/lib/pair-pm/types.ts to match.

Mirrors the TypeScript ``AgentState`` in src/lib/pair-pm/types.ts.
"""

from __future__ import annotations

from typing import Literal, Optional

from typing_extensions import NotRequired, TypedDict


FlowNodeType = Literal["action", "decision", "endpoint", "empty_state"]
NodeHighlight = Literal["yellow", "green"]
CommentStatus = Literal["open", "resolved"]


class FlowNode(TypedDict):
    id: str
    label: str
    type: FlowNodeType
    sourceQuote: str
    highlight: NotRequired[Optional[NodeHighlight]]


# Functional TypedDict syntax — `from` is a Python keyword and can't be a class attribute.
FlowEdge = TypedDict(
    "FlowEdge",
    {
        "from": str,
        "to": str,
        "label": NotRequired[str],
    },
)


class FlowDiagram(TypedDict):
    nodes: list[FlowNode]
    edges: list[FlowEdge]


class ReviewerComment(TypedDict):
    id: str
    quote: str
    question: str
    relatedNodeId: NotRequired[str]
    status: CommentStatus


class ResolvedQuestion(TypedDict):
    q: str
    a: str


class SpecCard(TypedDict):
    refinedPRD: str
    acceptanceCriteria: list[str]
    resolvedQuestions: list[ResolvedQuestion]


class PairPMState(TypedDict):
    """Agent emission — matches spec section 4 verbatim."""

    flowDiagram: FlowDiagram
    comments: list[ReviewerComment]
    specCard: NotRequired[Optional[SpecCard]]


class AgentStateExt(PairPMState):
    """Full shared state: agent emission + frontend-set inputs.

    Set by the frontend, read by the agent:
    - ``docContent``: PRD text from TipTap, debounced 2s.
    - ``requestSpecCard``: flipped true on "Generate engineering handoff" click.
    """

    docContent: str
    requestSpecCard: bool


EMPTY_STATE: AgentStateExt = {
    "flowDiagram": {"nodes": [], "edges": []},
    "comments": [],
    "specCard": None,
    "docContent": "",
    "requestSpecCard": False,
}
