"use client";

import { useCallback } from "react";
import { motion } from "framer-motion";
import { ClipboardCheck, CheckCircle } from "lucide-react";
import { FlowDiagram } from "./FlowDiagram";
import type { SpecCard as SpecCardType, FlowDiagram as FlowDiagramType } from "@/lib/pair-pm/types";

interface SpecCardProps {
  spec: SpecCardType;
  flowDiagram: FlowDiagramType;
}

export function SpecCard({ spec, flowDiagram }: SpecCardProps) {
  const handleCopy = useCallback(() => {
    const lines: string[] = [];
    lines.push(`# ${spec.refinedPRD.split("\n")[0].replace(/^#+\s*/, "")}`);
    lines.push("");
    lines.push(spec.refinedPRD.replace(/^#+\s*.*\n?/, "").trim());
    lines.push("");
    lines.push("## Acceptance Criteria");
    spec.acceptanceCriteria.forEach((ac) => {
      lines.push(`- ${ac}`);
    });
    lines.push("");
    lines.push("## Resolved Questions");
    spec.resolvedQuestions.forEach((rq) => {
      lines.push(`**Q:** ${rq.q}`);
      lines.push(`**A:** ${rq.a}`);
      lines.push("");
    });

    navigator.clipboard.writeText(lines.join("\n"));
  }, [spec]);

  return (
    <motion.div
      initial={{ x: 60, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 60, opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex h-full flex-col gap-4 overflow-auto rounded-xl border border-border bg-card p-5 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Engineering Handoff
        </h2>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
        >
          <ClipboardCheck className="h-3.5 w-3.5" />
          Copy as Linear ticket
        </button>
      </div>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Refined PRD
        </h3>
        <div className="rounded-lg border border-border bg-background p-4 text-sm leading-relaxed text-foreground">
          {spec.refinedPRD.split("\n").map((line, i) => (
            <p key={i} className={line.startsWith("#") ? "font-semibold mt-2" : "mt-1"}>
              {line.replace(/^#+\s*/, "")}
            </p>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Flow
        </h3>
        <div className="h-48 rounded-lg border border-border bg-background">
          <FlowDiagram diagram={flowDiagram} />
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Acceptance Criteria
        </h3>
        <ul className="space-y-2">
          {spec.acceptanceCriteria.map((ac, i) => (
            <li
              key={i}
              className="rounded-md border border-border bg-background px-3 py-2 font-mono text-xs leading-relaxed text-foreground"
            >
              {ac}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Resolved Questions
        </h3>
        <div className="space-y-3">
          {spec.resolvedQuestions.map((rq, i) => (
            <div
              key={i}
              className="rounded-md border border-green-200 bg-green-50/40 px-3 py-2"
            >
              <div className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-600" />
                <div>
                  <p className="text-xs font-medium text-foreground">{rq.q}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{rq.a}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </motion.div>
  );
}
