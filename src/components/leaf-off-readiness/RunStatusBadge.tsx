import { AlertTriangle, CheckCircle2, Clock3, FlaskConical, Loader2, XCircle, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MODEL_RUN_STATUS_LABELS, type ModelRunResultCounts, type ModelRunStatus } from "@/lib/model-runs";

const STATUS_STYLES: Record<ModelRunStatus, { className: string; icon: LucideIcon; spin?: boolean }> = {
  queued: { className: "bg-slate-100 text-slate-700 ring-slate-200", icon: Clock3 },
  running: { className: "bg-sky-50 text-sky-700 ring-sky-200", icon: Loader2, spin: true },
  succeeded: { className: "bg-emerald-50 text-emerald-700 ring-emerald-200", icon: CheckCircle2 },
  failed: { className: "bg-red-50 text-red-700 ring-red-200", icon: XCircle },
  partially_failed: { className: "bg-amber-50 text-amber-800 ring-amber-200", icon: AlertTriangle },
};

function titleCase(value: string) {
  const text = value.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Run or per-section status: always icon + text, never colour alone. */
export function RunStatusBadge({
  status,
  size = "md",
  className,
}: {
  status: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const style = STATUS_STYLES[status as ModelRunStatus];
  const label = MODEL_RUN_STATUS_LABELS[status as ModelRunStatus] ?? titleCase(status);
  const Icon = style?.icon;

  return (
    <Badge
      className={cn(
        "items-center gap-1.5 whitespace-nowrap",
        size === "sm" && "px-2 py-0.5 text-[11px]",
        style?.className ?? "bg-slate-100 text-slate-700 ring-slate-200",
        className,
      )}
    >
      {Icon ? (
        <Icon
          aria-hidden="true"
          className={cn("size-3.5", style?.spin && "motion-safe:animate-spin motion-reduce:animate-none")}
        />
      ) : null}
      {label}
    </Badge>
  );
}

export function SyntheticBadge({ className }: { className?: string }) {
  return (
    <Badge className={cn("items-center gap-1.5 whitespace-nowrap bg-violet-50 text-violet-700 ring-violet-200", className)}>
      <FlaskConical aria-hidden="true" className="size-3.5" />
      Synthetic data
    </Badge>
  );
}

const SEGMENTS: Array<{ key: keyof ModelRunResultCounts; className: string }> = [
  { key: "succeeded", className: "bg-emerald-500" },
  { key: "failed", className: "bg-red-500" },
  { key: "running", className: "bg-sky-500" },
  { key: "queued", className: "bg-slate-300" },
];

export function progressSummary(counts: ModelRunResultCounts, total: number) {
  const done = counts.succeeded + counts.failed;
  const parts = [`${done} of ${total} section${total === 1 ? "" : "s"} finished`];
  if (counts.failed > 0) {
    parts.push(`${counts.failed} failed`);
  }
  return parts.join(", ");
}

/** Segmented bar of per-section outcomes, with a text equivalent for screen readers. */
export function RunProgressBar({
  counts,
  total,
  className,
  showCaption = false,
}: {
  counts: ModelRunResultCounts;
  total: number;
  className?: string;
  showCaption?: boolean;
}) {
  const denominator = Math.max(total, 1);
  const summary = progressSummary(counts, total);

  return (
    <div className={className}>
      <div
        aria-label={summary}
        className="flex h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
        role="img"
      >
        {SEGMENTS.map(({ key, className: segmentClass }) =>
          counts[key] > 0 ? (
            <span
              className={cn("h-full transition-[width] duration-300 motion-reduce:transition-none", segmentClass)}
              key={key}
              style={{ width: `${(counts[key] / denominator) * 100}%` }}
            />
          ) : null,
        )}
      </div>
      {showCaption ? <RunCountsCaption className="mt-1.5" counts={counts} /> : null}
    </div>
  );
}

/** "3 succeeded · 1 failed", for places that want the counts without the bar. */
export function RunCountsCaption({ counts, className }: { counts: ModelRunResultCounts; className?: string }) {
  return (
    <p className={cn("text-xs text-slate-500", className)}>
      {[
        counts.succeeded ? `${counts.succeeded} succeeded` : null,
        counts.failed ? `${counts.failed} failed` : null,
        counts.running ? `${counts.running} running` : null,
        counts.queued ? `${counts.queued} queued` : null,
      ]
        .filter(Boolean)
        .join(" · ") || "No sections"}
    </p>
  );
}
