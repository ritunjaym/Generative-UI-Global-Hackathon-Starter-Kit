"""PairPMStateMiddleware — declares the Pair-PM canvas fields on the
agent's TypedDict state schema so they survive STATE_SNAPSHOT round-trips,
and hydrates a fresh thread's canvas from EMPTY_STATE on the first turn.

Without the schema declaration the agent's state would only contain
``messages``, ``jump_to``, ``structured_response``, ``copilotkit``. When the
agent emits ``STATE_SNAPSHOT`` to the frontend, the snapshot replaces the
frontend's local ``agent.state``, wiping any keys (``flowDiagram``,
``comments``, ``specCard``, ``docContent``, ``requestSpecCard``) the React
handlers wrote via ``agent.setState``.

By declaring those keys here, LangGraph carries them through state-event
emission so the frontend's canvas state survives reloads of the run loop.

Hydration on a fresh thread:
- Each LangGraph thread is its own state slot. Without hydration, "+ new
  thread" gives the user an empty canvas.
- ``before_agent`` runs once per turn, before the model fires. If the
  state is missing Pair-PM fields, we return an update that pre-populates
  them with EMPTY_STATE defaults so the canvas initializes immediately.
- The check is "flowDiagram not in state", so within a thread that already
  has fields, we never re-hydrate (and never overwrite user edits).
"""

from __future__ import annotations

from typing import Annotated, Any, Optional

from langchain.agents.middleware.types import AgentMiddleware, AgentState
from typing_extensions import NotRequired

from .pair_pm_state import (
    EMPTY_STATE,
    AgentStateExt,
    FlowDiagram,
    ReviewerComment,
    SpecCard,
)
from .state_validator import validate_pair_pm_fields


def _replace(_left: Any, right: Any) -> Any:
    """LangGraph reducer that always takes the most recent value.

    Without an explicit reducer, LangGraph would either default to
    last-write-wins for scalars or raise on conflicting types.
    """
    return right


class PairPMCanvasState(AgentState):
    """Extended agent state for the Pair-PM canvas.

    Each field is `NotRequired` so the agent can boot without all fields
    set; the frontend's `mergeState` provides defaults on the React side.
    """

    flowDiagram: NotRequired[Annotated[FlowDiagram, _replace]]
    comments: NotRequired[Annotated[list[ReviewerComment], _replace]]
    specCard: NotRequired[Annotated[Optional[SpecCard], _replace]]
    docContent: NotRequired[Annotated[str, _replace]]
    requestSpecCard: NotRequired[Annotated[bool, _replace]]


class PairPMStateMiddleware(AgentMiddleware[PairPMCanvasState, Any]):  # type: ignore[type-arg]
    """Contributes the Pair-PM canvas state schema and hydrates fresh threads.

    LangGraph merges the state schemas of every middleware in the chain, so
    inserting this alongside CopilotKitMiddleware adds the Pair-PM fields to
    the graph's state. The ``before_agent`` hook ensures a fresh thread starts
    with a populated canvas instead of an empty one. The ``after_model`` hook
    validates the agent's structured output and falls back to the previous
    good state on validation failure — see the module docstring for the full
    rationale.
    """

    state_schema = PairPMCanvasState

    def __init__(self) -> None:
        super().__init__()
        # Snapshot of Pair-PM fields taken at the start of each turn.
        # Used by after_model to restore previous state on validation failure.
        self._previous_pair_pm: dict[str, Any] | None = None

    def before_agent(self, state: Any, runtime: Any) -> dict[str, Any] | None:
        """Hydrate missing fields on first turn; snapshot current state.

        Returns ``None`` (no update) when the thread already has Pair-PM
        fields initialized.
        """
        if not isinstance(state, dict):
            return None

        # Snapshot the current Pair-PM fields so after_model can fall back.
        self._previous_pair_pm = {
            "flowDiagram": state.get("flowDiagram", {"nodes": [], "edges": []}),
            "comments": state.get("comments", []),
            "specCard": state.get("specCard"),
            "docContent": state.get("docContent", ""),
            "requestSpecCard": state.get("requestSpecCard", False),
        }

        # If flowDiagram is already present, the state has been initialized
        if "flowDiagram" in state:
            return None

        # Return EMPTY_STATE defaults for a truly fresh thread.
        # We only return fields that are missing to avoid overwriting
        # any frontend-set values (docContent / requestSpecCard).
        updates: dict[str, Any] = {}
        if "flowDiagram" not in state:
            updates["flowDiagram"] = EMPTY_STATE["flowDiagram"]
        if "comments" not in state:
            updates["comments"] = EMPTY_STATE["comments"]
        if "specCard" not in state:
            updates["specCard"] = EMPTY_STATE["specCard"]
        if "docContent" not in state:
            updates["docContent"] = EMPTY_STATE["docContent"]
        if "requestSpecCard" not in state:
            updates["requestSpecCard"] = EMPTY_STATE["requestSpecCard"]
        return updates if updates else None

    def after_model(self, state: Any, runtime: Any) -> dict[str, Any] | None:
        """Validate Pair-PM fields after the model emits; retain previous on failure."""
        if not isinstance(state, dict):
            return None

        errors = validate_pair_pm_fields(state)
        if not errors:
            return None

        print(
            f"[pair_pm_middleware] validation failed: {'; '.join(errors)}. "
            "Restoring previous good state.",
            flush=True,
        )

        if self._previous_pair_pm is not None:
            return {
                "flowDiagram": self._previous_pair_pm["flowDiagram"],
                "comments": self._previous_pair_pm["comments"],
                "specCard": self._previous_pair_pm["specCard"],
                # Preserve current frontend inputs if they exist
                "docContent": state.get(
                    "docContent", self._previous_pair_pm.get("docContent", "")
                ),
                "requestSpecCard": state.get(
                    "requestSpecCard",
                    self._previous_pair_pm.get("requestSpecCard", False),
                ),
            }

        # No previous snapshot — fall back to hard empty state
        return {
            "flowDiagram": {"nodes": [], "edges": []},
            "comments": [],
            "specCard": None,
        }
