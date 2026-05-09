"""JSON state validator — wraps agent emissions to ensure they match PairPMState.

On parse/validation failure, logs the error and signals the caller to retain
the previous state. Never crashes the UI mid-demo.
"""

from __future__ import annotations

import json
import traceback
from typing import Any

from .pair_pm_state import AgentStateExt, EMPTY_STATE


def validate_pair_pm_fields(state: dict[str, Any]) -> list[str]:
    """Validate that ``state`` contains well-formed Pair-PM fields.

    Returns a list of human-readable error strings. An empty list means the
    state is valid.
    """
    errors: list[str] = []

    # flowDiagram is required
    flow_diagram = state.get("flowDiagram")
    if flow_diagram is None:
        errors.append("Missing required field: flowDiagram")
    elif not isinstance(flow_diagram, dict):
        errors.append(
            f"flowDiagram must be a dict, got {type(flow_diagram).__name__}"
        )
    else:
        if "nodes" not in flow_diagram:
            errors.append("flowDiagram missing 'nodes'")
        elif not isinstance(flow_diagram["nodes"], list):
            errors.append(
                f"flowDiagram.nodes must be a list, got {type(flow_diagram['nodes']).__name__}"
            )
        else:
            for i, node in enumerate(flow_diagram["nodes"]):
                if not isinstance(node, dict):
                    errors.append(f"flowDiagram.nodes[{i}] is not a dict")
                elif "id" not in node:
                    errors.append(f"flowDiagram.nodes[{i}] missing 'id'")
                elif "label" not in node:
                    errors.append(f"flowDiagram.nodes[{i}] missing 'label'")
                elif "type" not in node:
                    errors.append(f"flowDiagram.nodes[{i}] missing 'type'")

        if "edges" not in flow_diagram:
            errors.append("flowDiagram missing 'edges'")
        elif not isinstance(flow_diagram["edges"], list):
            errors.append(
                f"flowDiagram.edges must be a list, got {type(flow_diagram['edges']).__name__}"
            )
        else:
            for i, edge in enumerate(flow_diagram["edges"]):
                if not isinstance(edge, dict):
                    errors.append(f"flowDiagram.edges[{i}] is not a dict")
                elif "from" not in edge:
                    errors.append(f"flowDiagram.edges[{i}] missing 'from'")
                elif "to" not in edge:
                    errors.append(f"flowDiagram.edges[{i}] missing 'to'")

    # comments is required
    comments = state.get("comments")
    if comments is None:
        errors.append("Missing required field: comments")
    elif not isinstance(comments, list):
        errors.append(f"comments must be a list, got {type(comments).__name__}")
    else:
        for i, comment in enumerate(comments):
            if not isinstance(comment, dict):
                errors.append(f"comments[{i}] is not a dict")
            elif "id" not in comment:
                errors.append(f"comments[{i}] missing 'id'")
            elif "quote" not in comment:
                errors.append(f"comments[{i}] missing 'quote'")
            elif "question" not in comment:
                errors.append(f"comments[{i}] missing 'question'")
            elif "status" not in comment:
                errors.append(f"comments[{i}] missing 'status'")

    # specCard is optional, but if present must be a dict with required fields
    spec_card = state.get("specCard")
    if spec_card is not None:
        if not isinstance(spec_card, dict):
            errors.append(f"specCard must be a dict or null, got {type(spec_card).__name__}")
        else:
            if "refinedPRD" not in spec_card:
                errors.append("specCard missing 'refinedPRD'")
            if "acceptanceCriteria" not in spec_card:
                errors.append("specCard missing 'acceptanceCriteria'")
            elif not isinstance(spec_card.get("acceptanceCriteria"), list):
                errors.append(
                    f"specCard.acceptanceCriteria must be a list, got {type(spec_card.get('acceptanceCriteria')).__name__}"
                )
            if "resolvedQuestions" not in spec_card:
                errors.append("specCard missing 'resolvedQuestions'")
            elif not isinstance(spec_card.get("resolvedQuestions"), list):
                errors.append(
                    f"specCard.resolvedQuestions must be a list, got {type(spec_card.get('resolvedQuestions')).__name__}"
                )

    return errors


def validate_or_retain(
    candidate: dict[str, Any] | str,
    previous: AgentStateExt | dict[str, Any],
) -> AgentStateExt:
    """Parse ``candidate`` (LLM output). If it matches PairPMState shape,
    return a merged state. On any parse/validation failure, log the error
    and return ``previous`` unchanged (with all required keys guaranteed).
    """
    try:
        # Normalize candidate to a dict
        if isinstance(candidate, str):
            parsed: dict[str, Any] = json.loads(candidate)
        elif isinstance(candidate, dict):
            parsed = candidate
        else:
            raise TypeError(
                f"Expected dict or str, got {type(candidate).__name__}"
            )

        if not isinstance(parsed, dict):
            raise TypeError(
                f"Parsed value is not a dict: {type(parsed).__name__}"
            )

        errors = validate_pair_pm_fields(parsed)
        if errors:
            raise ValueError("; ".join(errors))

        # Build validated state, preserving frontend inputs from previous
        validated: AgentStateExt = {
            "flowDiagram": parsed["flowDiagram"],
            "comments": parsed["comments"],
            "specCard": parsed.get("specCard"),
            "docContent": parsed.get("docContent", previous.get("docContent", "")),
            "requestSpecCard": parsed.get(
                "requestSpecCard", previous.get("requestSpecCard", False)
            ),
        }
        return validated

    except Exception as e:
        print(f"[state_validator] VALIDATION FAILED: {e}", flush=True)
        traceback.print_exc()

        # Return previous state, ensuring it has the full AgentStateExt shape
        if isinstance(previous, dict):
            return {
                "flowDiagram": previous.get("flowDiagram", {"nodes": [], "edges": []}),
                "comments": previous.get("comments", []),
                "specCard": previous.get("specCard"),
                "docContent": previous.get("docContent", ""),
                "requestSpecCard": previous.get("requestSpecCard", False),
            }
        return EMPTY_STATE
