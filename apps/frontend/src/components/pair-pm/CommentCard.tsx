"use client";

import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReviewerComment } from "@/lib/pair-pm/types";

interface CommentCardProps {
  comment: ReviewerComment;
  onResolve?: (id: string) => void;
  onHover?: (relatedNodeId: string | undefined) => void;
}

export function CommentCard({ comment, onResolve, onHover }: CommentCardProps) {
  const isResolved = comment.status === "resolved";

  return (
    <div
      className={cn(
        "rounded-lg border p-3 transition-all duration-300",
        isResolved
          ? "border-green-300 bg-green-50/50 opacity-60"
          : "border-border bg-card",
      )}
      onMouseEnter={() => onHover?.(comment.relatedNodeId)}
      onMouseLeave={() => onHover?.(undefined)}
    >
      <div className="flex items-start gap-2">
        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <MessageCircle className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-foreground">
              Pair-PM
            </span>
            {isResolved && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700">
                Resolved
              </span>
            )}
          </div>
          <blockquote className="mt-1 border-l-2 border-primary/30 pl-2 text-xs italic text-muted-foreground">
            &ldquo;{comment.quote}&rdquo;
          </blockquote>
          <p className="mt-1.5 text-sm text-foreground">{comment.question}</p>
          {!isResolved && onResolve && (
            <button
              onClick={() => onResolve(comment.id)}
              className="mt-2 rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Mark resolved
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
