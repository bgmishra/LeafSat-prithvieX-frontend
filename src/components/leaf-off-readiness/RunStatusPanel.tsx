"use client";

import Link from "next/link";
import { ArrowRight, RotateCw } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatRelative } from "@/lib/format";
import type { ModelRunDetail } from "@/lib/model-runs";
import { cn } from "@/lib/utils";
import { useModelProduct } from "./model-product";
import { RunProgressBar, RunStatusBadge } from "./RunStatusBadge";

export const PRIMARY_BUTTON_CLASS = "bg-teal-700 text-white hover:bg-teal-800";

export function runHeadline(run: Pick<ModelRunDetail, "id" | "status">) {
  switch (run.status) {
    case "queued":
      return `Run #${run.id} queued`;
    case "running":
      return `Run #${run.id} running`;
    case "succeeded":
      return `Run #${run.id} finished`;
    case "partially_failed":
      return `Run #${run.id} finished with errors`;
    case "failed":
      return `Run #${run.id} failed`;
    default:
      return `Run #${run.id}`;
  }
}

function subCopy(run: ModelRunDetail) {
  const total = run.section_count;
  const counts = run.result_counts;
  switch (run.status) {
    case "queued":
      return "We'll email you when it finishes. You can leave this page.";
    case "running":
      return `${counts.succeeded + counts.failed} of ${total} sections finished. We'll email you when it finishes.`;
    case "succeeded":
      return `All ${total} section${total === 1 ? "" : "s"} processed.`;
    case "partially_failed":
      return `${counts.succeeded} of ${total} sections processed, ${counts.failed} failed. See results for details.`;
    case "failed":
      return run.error_message || "No sections could be processed.";
    default:
      return "";
  }
}

/** Shown on Run Model after a run is started; polled by the parent. */
export function RunStatusPanel({
  className,
  onDismiss,
  pollError,
  run,
}: {
  className?: string;
  onDismiss: () => void;
  pollError: boolean;
  run: ModelRunDetail;
}) {
  const finished = run.is_finished;
  const resultsHref = useModelProduct().resultsHref({ run: run.id });

  return (
    <Card className={cn("space-y-3 border-teal-200 bg-teal-50/40 p-4", className)}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <RunStatusBadge status={run.status} />
        <p aria-live="polite" className="text-sm font-semibold text-slate-950" role="status">
          {runHeadline(run)}
        </p>
        <span className="ml-auto text-xs text-slate-500" title={new Date(run.created_at).toLocaleString()}>
          {formatRelative(run.created_at)}
        </span>
      </div>
      <RunProgressBar counts={run.result_counts} showCaption total={run.section_count} />
      <p className={cn("text-sm", run.status === "failed" ? "text-red-700" : "text-slate-600")}>{subCopy(run)}</p>
      {pollError ? (
        <p className="flex items-center gap-1.5 text-xs text-slate-500">
          <RotateCw aria-hidden="true" className="size-3.5" />
          Couldn&apos;t refresh the status. Retrying…
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Link
          className={buttonVariants({
            className: finished ? PRIMARY_BUTTON_CLASS : undefined,
            size: "sm",
            variant: finished ? "default" : "outline",
          })}
          href={resultsHref}
        >
          {finished ? "Open results" : "View results"}
          <ArrowRight aria-hidden="true" />
        </Link>
        <Button onClick={onDismiss} size="sm" type="button" variant="ghost">
          Run another
        </Button>
      </div>
    </Card>
  );
}
