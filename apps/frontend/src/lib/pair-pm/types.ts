// PairPMState — the integration contract between agent (apps/agent) and UI.
// Field names locked by docs/pair-pm-spec.pdf section 4 — DO NOT rename
// without updating apps/agent/src/pair_pm_state.py to match.

export type FlowNodeType = "action" | "decision" | "endpoint" | "empty_state";
export type NodeHighlight = "yellow" | "green" | null;
export type CommentStatus = "open" | "resolved";

export interface FlowNode {
  id: string;
  label: string;
  type: FlowNodeType;
  sourceQuote: string;
  highlight?: NodeHighlight;
}

export interface FlowEdge {
  from: string;
  to: string;
  label?: string;
}

export interface FlowDiagram {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface ReviewerComment {
  id: string;
  quote: string;
  question: string;
  relatedNodeId?: string;
  status: CommentStatus;
}

export interface ResolvedQuestion {
  q: string;
  a: string;
}

export interface SpecCard {
  refinedPRD: string;
  acceptanceCriteria: string[];
  resolvedQuestions: ResolvedQuestion[];
}

// Agent emission — matches spec section 4 verbatim.
export interface PairPMState {
  flowDiagram: FlowDiagram;
  comments: ReviewerComment[];
  specCard?: SpecCard;
}

// Full CopilotKit shared state: agent emission + frontend-set inputs.
export interface AgentState extends PairPMState {
  docContent: string;
  requestSpecCard: boolean;
}

export const initialAgentState: AgentState = {
  flowDiagram: { nodes: [], edges: [] },
  comments: [],
  docContent: "",
  requestSpecCard: false,
};
