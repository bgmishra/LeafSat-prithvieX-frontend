import { cn } from "@/lib/utils";
import { READINESS_GRADIENT_CSS, READINESS_TICKS } from "@/lib/readiness";
import { useModelProduct } from "./model-product";
import { SyntheticBadge } from "./RunStatusBadge";

function tickTransform(index: number, count: number) {
  if (index === 0) {
    return "translate-x-0";
  }
  if (index === count - 1) {
    return "-translate-x-full";
  }
  return "-translate-x-1/2";
}

/**
 * Legend for the product's 0–1 raster on the readiness colour ramp: 0.0 green →
 * 0.5 yellow → 1.0 red. Readiness words it "Not ready" / "Moderate" / "Ready",
 * Forecast "Unlikely" / "Possible" / "Likely". Numbers and words are always
 * shown, so it does not rely on colour.
 */
export function ReadinessLegend({
  className,
  dimmed = false,
  isSynthetic = false,
  targetDate = null,
  valueMax,
  valueMin,
}: {
  className?: string;
  dimmed?: boolean;
  isSynthetic?: boolean;
  /** Forecast only: the date the probability refers to. */
  targetDate?: string | null;
  valueMax?: number | null;
  valueMin?: number | null;
}) {
  const { legend } = useModelProduct();
  const labels = legend.labels;
  const title = legend.title(targetDate);
  const range =
    typeof valueMin === "number" && typeof valueMax === "number" ? { max: valueMax, min: valueMin } : null;
  const clamp = (value: number) => Math.min(1, Math.max(0, value));

  return (
    <figure
      aria-label={`${title} legend: 0 ${labels.low.toLowerCase()} (green), 0.5 ${labels.mid.toLowerCase()} (yellow), 1 ${labels.high.toLowerCase()} (red). Outside the section is transparent.${
        range ? ` This section ranges from ${range.min.toFixed(2)} to ${range.max.toFixed(2)}.` : ""
      }${isSynthetic ? " Synthetic data." : ""}`}
      className={cn("text-slate-700 transition-opacity duration-150", dimmed && "opacity-40", className)}
      role="img"
    >
      <div className="flex items-center justify-between gap-2">
        <figcaption className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </figcaption>
        {isSynthetic ? <SyntheticBadge className="px-2 py-0.5 text-[10px]" /> : null}
      </div>

      <div className="relative mt-3">
        {range ? (
          <span
            aria-hidden="true"
            className="absolute -top-1.5 h-0.5 rounded-full bg-slate-900"
            style={{
              left: `${clamp(range.min) * 100}%`,
              width: `${Math.max(clamp(range.max) - clamp(range.min), 0.01) * 100}%`,
            }}
          />
        ) : null}
        <div
          aria-hidden="true"
          className="h-3 rounded-full ring-1 ring-inset ring-black/10"
          style={{ backgroundImage: READINESS_GRADIENT_CSS }}
        />
      </div>

      <div aria-hidden="true" className="relative mt-1 h-6">
        {READINESS_TICKS.map((tick, index) => (
          <span
            className={cn("absolute top-0 flex flex-col items-center", tickTransform(index, READINESS_TICKS.length))}
            key={tick}
            style={{ left: `${tick * 100}%` }}
          >
            <span className="h-1.5 w-px bg-slate-400" />
            <span className="font-mono text-[11px] tabular-nums text-slate-500">{tick.toFixed(tick % 0.5 ? 2 : 1)}</span>
          </span>
        ))}
      </div>

      <div aria-hidden="true" className="mt-0.5 flex justify-between text-xs font-semibold">
        <span className="text-emerald-700">{labels.low}</span>
        <span className="text-amber-700">{labels.mid}</span>
        <span className="text-red-700">{labels.high}</span>
      </div>

      <p className="mt-2 text-[11px] leading-4 text-slate-500">
        {legend.caption}
      </p>
      {range ? (
        <p className="text-[11px] leading-4 text-slate-500">
          This section:{" "}
          <span className="font-mono tabular-nums text-slate-700">
            {range.min.toFixed(2)} – {range.max.toFixed(2)}
          </span>
        </p>
      ) : null}
      <p className="mt-1 flex items-center gap-1.5 text-[11px] leading-4 text-slate-500">
        <span
          aria-hidden="true"
          className="inline-block size-3 rounded-sm ring-1 ring-inset ring-slate-300"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, #cbd5e1 0, #cbd5e1 1px, transparent 1px, transparent 4px)",
          }}
        />
        No data (outside section) — transparent
      </p>
    </figure>
  );
}
