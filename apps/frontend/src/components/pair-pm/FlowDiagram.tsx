"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  Edge,
  Node,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "reactflow";
import "reactflow/dist/style.css";
import { motion, AnimatePresence } from "framer-motion";
import { FlowNode } from "./FlowNode";
import type { FlowDiagram as FlowDiagramType, FlowNode as FlowNodeType } from "@/lib/pair-pm/types";

const nodeTypes = { pairPmNode: FlowNode };

function computeLayout(nodes: FlowNodeType[], edges: { from: string; to: string; label?: string }[]): { x: number; y: number }[] {
  // Simple left-to-right layout with branch stacking
  const incoming = new Map<string, string[]>();
  const outgoing = new Map<string, string[]>();
  edges.forEach((e) => {
    outgoing.set(e.from, [...(outgoing.get(e.from) || []), e.to]);
    incoming.set(e.to, [...(incoming.get(e.to) || []), e.from]);
  });

  const positions = new Map<string, { x: number; y: number }>();
  const visited = new Set<string>();
  const H_GAP = 200;
  const V_GAP = 100;

  function placeNode(id: string, depth: number, preferredY: number): number {
    if (visited.has(id)) {
      return positions.get(id)?.y ?? preferredY;
    }
    visited.add(id);

    const parents = incoming.get(id) || [];
    let y = preferredY;

    if (parents.length > 0) {
      const parentYs = parents.map((p) => positions.get(p)?.y ?? 0);
      const minParentY = Math.min(...parentYs);
      const siblings = parents.flatMap((p) => outgoing.get(p) || []);
      const myIndex = siblings.indexOf(id);
      y = minParentY + myIndex * V_GAP;
    }

    // Resolve collisions at this depth
    const placedAtDepth = Array.from(positions.entries()).filter(([_, pos]) => {
      const nodeDepth = Math.round(pos.x / H_GAP);
      return nodeDepth === depth;
    });

    let adjustedY = y;
    for (const [_, pos] of placedAtDepth) {
      if (Math.abs(pos.y - adjustedY) < V_GAP - 10) {
        adjustedY = pos.y + V_GAP;
      }
    }

    positions.set(id, { x: depth * H_GAP + 40, y: adjustedY + 40 });

    const children = outgoing.get(id) || [];
    children.forEach((child, i) => {
      placeNode(child, depth + 1, adjustedY + i * V_GAP);
    });

    return adjustedY;
  }

  // Find roots (nodes with no incoming edges)
  const roots = nodes.filter((n) => !incoming.has(n.id) || incoming.get(n.id)!.length === 0);
  roots.forEach((root, i) => placeNode(root.id, 0, i * V_GAP));

  // Handle any unplaced nodes (cycles / disconnected)
  nodes.forEach((n) => {
    if (!visited.has(n.id)) {
      placeNode(n.id, 0, 0);
    }
  });

  return nodes.map((n) => positions.get(n.id) ?? { x: 0, y: 0 });
}

function FlowDiagramInner({
  diagram,
  highlightNodeId,
}: {
  diagram: FlowDiagramType;
  highlightNodeId?: string;
}) {
  const { fitView } = useReactFlow();
  const prevNodeIdsRef = useRef<Set<string>>(new Set());
  const [newNodeIds, setNewNodeIds] = useState<Set<string>>(new Set());

  const positions = useMemo(
    () => computeLayout(diagram.nodes, diagram.edges),
    [diagram],
  );

  const flowNodes: Node[] = useMemo(() => {
    return diagram.nodes.map((n, i) => {
      const pos = positions[i] ?? { x: 0, y: 0 };
      const isNew = newNodeIds.has(n.id);
      return {
        id: n.id,
        type: "pairPmNode",
        position: pos,
        data: {
          label: n.label,
          highlight: n.id === highlightNodeId ? "yellow" : (isNew ? "green" : n.highlight),
        },
      };
    });
  }, [diagram.nodes, positions, highlightNodeId, newNodeIds]);

  const flowEdges: Edge[] = useMemo(() => {
    return diagram.edges.map((e, i) => ({
      id: `e${i}`,
      source: e.from,
      target: e.to,
      label: e.label,
      type: "smoothstep",
      animated: true,
      style: { stroke: "#94a3b8", strokeWidth: 2 },
    }));
  }, [diagram.edges]);

  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges);

  // Detect new nodes and animate them
  useEffect(() => {
    const currentIds = new Set(diagram.nodes.map((n) => n.id));
    const prevIds = prevNodeIdsRef.current;
    const added = new Set<string>();
    currentIds.forEach((id) => {
      if (!prevIds.has(id)) added.add(id);
    });

    if (added.size > 0) {
      setNewNodeIds(added);
      // Clear green highlight after 400ms
      const t = setTimeout(() => {
        setNewNodeIds((prev) => {
          const next = new Set(prev);
          added.forEach((id) => next.delete(id));
          return next;
        });
      }, 400);
      return () => clearTimeout(t);
    }

    prevNodeIdsRef.current = currentIds;
  }, [diagram.nodes]);

  useEffect(() => {
    setNodes(flowNodes);
    setEdges(flowEdges);
    // Small delay to let nodes settle before fitting
    const t = setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 50);
    return () => clearTimeout(t);
  }, [flowNodes, flowEdges, setNodes, setEdges, fitView]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      fitView
      attributionPosition="bottom-left"
      proOptions={{ hideAttribution: true }}
    >
      <Background gap={16} size={1} color="#e2e8f0" />
      <Controls />
    </ReactFlow>
  );
}

export function FlowDiagram({
  diagram,
  highlightNodeId,
}: {
  diagram: FlowDiagramType;
  highlightNodeId?: string;
}) {
  return (
    <div className="relative h-full w-full rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <ReactFlowProvider>
        <FlowDiagramInner diagram={diagram} highlightNodeId={highlightNodeId} />
      </ReactFlowProvider>
    </div>
  );
}
