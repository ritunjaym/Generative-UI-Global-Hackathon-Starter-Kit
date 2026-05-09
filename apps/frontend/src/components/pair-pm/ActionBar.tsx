"use client";

import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActionBarProps {
  resolvedCount: number;
  totalCount: number;
  onGenerateHandoff: () => void;
  showReset?: boolean;
  onReset?: () => void;
}

export function ActionBar({
  resolvedCount,
  totalCount,
  onGenerateHandoff,
  showReset,
  onReset,
}: ActionBarProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-2.5 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          Resolved
        </span>
        <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-foreground">
          {resolvedCount} of {totalCount}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {showReset && onReset && (
          <button
            onClick={onReset}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Back to diagram
          </button>
        )}
        <button
          onClick={onGenerateHandoff}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            showReset
              ? "border border-border text-muted-foreground hover:bg-muted"
              : "bg-primary text-primary-foreground hover:opacity-90",
          )}
        >
          <FileText className="h-3.5 w-3.5" />
          Generate engineering handoff
        </button>
      </div>
    </div>
  );
}
