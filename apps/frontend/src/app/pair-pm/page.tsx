"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CopilotChatConfigurationProvider,
  CopilotSidebar,
  useAgent,
  useConfigureSuggestions,
} from "@copilotkit/react-core/v2";
import { ThreadsDrawer } from "@/components/threads-drawer";
import drawerStyles from "@/components/threads-drawer/threads-drawer.module.css";

import type { AgentState } from "@/lib/pair-pm/types";
import { initialAgentState } from "@/lib/pair-pm/types";

import { PRDEditor } from "@/components/pair-pm/PRDEditor";
import { FlowDiagram } from "@/components/pair-pm/FlowDiagram";
import { CommentCard } from "@/components/pair-pm/CommentCard";
import { SpecCard } from "@/components/pair-pm/SpecCard";
import { ActionBar } from "@/components/pair-pm/ActionBar";

function mergeAgentState(raw: unknown): AgentState {
  const partial =
    raw && typeof raw === "object" ? (raw as Partial<AgentState>) : {};
  return {
    ...initialAgentState,
    ...partial,
    flowDiagram: {
      nodes: partial.flowDiagram?.nodes ?? initialAgentState.flowDiagram.nodes,
      edges: partial.flowDiagram?.edges ?? initialAgentState.flowDiagram.edges,
    },
    comments: partial.comments ?? initialAgentState.comments,
    docContent: partial.docContent ?? initialAgentState.docContent,
    requestSpecCard: partial.requestSpecCard ?? initialAgentState.requestSpecCard,
  };
}

function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <>{children}</>;
}

function CanvasInner() {
  const { agent } = useAgent();
  const [hoveredNodeId, setHoveredNodeId] = useState<string | undefined>();

  useConfigureSuggestions({
    available: "before-first-message",
    suggestions: [
      {
        title: "Start a PRD",
        message:
          "I want to write a PRD about date-range filtering for an analytics dashboard.",
      },
    ],
  });

  const state = useMemo(() => mergeAgentState(agent?.state), [agent?.state]);

  const updateState = useCallback(
    (updater: (prev: AgentState) => AgentState) => {
      if (!agent) return;
      agent.setState(updater(mergeAgentState(agent.state)));
    },
    [agent],
  );

  const handleEditorChange = useCallback(
    (html: string) => {
      updateState((prev) => ({ ...prev, docContent: html }));
    },
    [updateState],
  );

  const handleResolveComment = useCallback(
    (id: string) => {
      updateState((prev) => ({
        ...prev,
        comments: prev.comments.map((c) =>
          c.id === id ? { ...c, status: "resolved" as const } : c,
        ),
      }));
    },
    [updateState],
  );

  const handleGenerateHandoff = useCallback(() => {
    updateState((prev) => ({ ...prev, requestSpecCard: true }));
  }, [updateState]);

  const handleResetHandoff = useCallback(() => {
    updateState((prev) => ({ ...prev, requestSpecCard: false }));
  }, [updateState],
  );

  const resolvedCount = state.comments.filter((c) => c.status === "resolved").length;
  const totalCount = state.comments.length;
  const showSpecCard = state.requestSpecCard && state.specCard != null;

  const openComments = state.comments.filter((c) => c.status === "open");
  const resolvedComments = state.comments.filter((c) => c.status === "resolved");

  return (
    <>
      <main className="flex h-screen flex-row gap-4 overflow-hidden bg-background px-4 py-4">
        {/* LEFT: PRD Editor — 50% */}
        <div className="flex w-1/2 flex-col">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              PRD Editor
            </span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
              Draft
            </span>
          </div>
          <div className="flex-1 min-h-0">
            <PRDEditor content={state.docContent} onChange={handleEditorChange} />
          </div>
        </div>

        {/* RIGHT: 50% — 60/40 split */}
        <div className="flex w-1/2 flex-col gap-3">
          {/* Action Bar */}
          <ActionBar
            resolvedCount={resolvedCount}
            totalCount={totalCount}
            onGenerateHandoff={handleGenerateHandoff}
            showReset={showSpecCard}
            onReset={handleResetHandoff}
          />

          {/* Top pane — Flow Diagram or Spec Card */}
          <div className="relative flex-[3] min-h-0">
            <AnimatePresence mode="wait">
              {showSpecCard && state.specCard ? (
                <SpecCard
                  key="spec"
                  spec={state.specCard}
                  flowDiagram={state.flowDiagram}
                />
              ) : (
                <motion.div
                  key="flow"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="h-full"
                >
                  <FlowDiagram
                    diagram={state.flowDiagram}
                    highlightNodeId={hoveredNodeId}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom pane — Comments */}
          <div className="flex-[2] flex flex-col gap-2 min-h-0 overflow-hidden">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Reviewer comments
            </span>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {openComments.length === 0 && resolvedComments.length === 0 && (
                <p className="text-sm text-muted-foreground italic">
                  No comments yet. Keep typing…
                </p>
              )}
              <AnimatePresence>
                {openComments.map((comment) => (
                  <motion.div
                    key={comment.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <CommentCard
                      comment={comment}
                      onResolve={handleResolveComment}
                      onHover={setHoveredNodeId}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>

              {resolvedComments.length > 0 && (
                <div className="mt-3 border-t border-border pt-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Resolved ({resolvedCount} of {totalCount})
                  </span>
                  <div className="mt-2 space-y-2">
                    {resolvedComments.map((comment) => (
                      <motion.div
                        key={comment.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <CommentCard
                          comment={comment}
                          onHover={setHoveredNodeId}
                        />
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <CopilotSidebar
        defaultOpen
        width={420}
        input={{ disclaimer: () => null, className: "pb-6" }}
      />
    </>
  );
}

function HomePage() {
  const [threadId, setThreadId] = useState<string | undefined>(undefined);
  return (
    <div className={drawerStyles.layout}>
      <ThreadsDrawer
        agentId="default"
        threadId={threadId}
        onThreadChange={setThreadId}
      />
      <div className={drawerStyles.mainPanel}>
        <CopilotChatConfigurationProvider agentId="default" threadId={threadId}>
          <CanvasInner />
        </CopilotChatConfigurationProvider>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <ClientOnly>
      <HomePage />
    </ClientOnly>
  );
}
