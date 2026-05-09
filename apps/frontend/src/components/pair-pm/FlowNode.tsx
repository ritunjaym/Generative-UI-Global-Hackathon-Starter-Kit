"use client";

import { memo } from "react";
import { Handle, Position } from "reactflow";
import { cn } from "@/lib/utils";
import type { NodeHighlight } from "@/lib/pair-pm/types";

export interface FlowNodeData {
  label: string;
  highlight?: NodeHighlight;
  isNew?: boolean;
}

function FlowNodeComponent({ data }: { data: FlowNodeData }) {
  const { label, highlight } = data;

  return (
    <div
      className={cn(
        "relative rounded-lg border px-4 py-2 shadow-sm transition-all duration-300",
        "min-w-[140px] text-center text-sm font-medium",
        highlight === "yellow" &&
          "border-yellow-400 bg-yellow-50 text-yellow-900 shadow-[0_0_12px_rgba(250,204,21,0.6)]",
        highlight === "green" &&
          "border-green-400 bg-green-50 text-green-900 shadow-[0_0_12px_rgba(74,222,128,0.6)]",
        !highlight && "border-border bg-card text-foreground",
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-muted-foreground !w-2 !h-2"
      />
      <span>{label}</span>
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-muted-foreground !w-2 !h-2"
      />
    </div>
  );
}

export const FlowNode = memo(FlowNodeComponent);
