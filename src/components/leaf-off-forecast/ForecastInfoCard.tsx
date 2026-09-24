import { CalendarClock } from "lucide-react";
import { formatDate } from "@/lib/format";
import { isActiveRunStatus, type ModelRunDetail, type ModelRunResultDetail } from "@/lib/model-runs";
import { forecastTargetDate, formatHorizon, formatTargetWeekday } from "./forecast-dates";

/** The forecast facts for one section: what date it is for, how far ahead, and the value range. */
export function ForecastInfoCard({ result, run }: { result: ModelRunResultDetail; run: ModelRunDetail }) {
  const forecast = result.forecast ?? null;
  const target = forecastTargetDate(run, result);
  const pending = isActiveRunStatus(result.status);
  const min = forecast?.value_min;
  const max = forecast?.value_max;
  const range = typeof min === "number" && typeof max === "number" ? `${min.toFixed(2)} – ${max.toFixed(2)}` : null;

  return (
    <section aria-labelledby="forecast-heading" className="space-y-2">
      <h2 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500" id="forecast-heading">
        Forecast
      </h2>
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-slate-950">
          <CalendarClock aria-hidden="true" className="size-4 text-teal-700" />
          {target ? (
            <span>
              Leaf-off by <time className="font-mono tabular-nums" dateTime={target}>{target}</time>
              <span className="font-normal text-slate-500"> · {formatTargetWeekday(target)}</span>
            </span>
          ) : (
            "Target date not set"
          )}
        </p>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="text-slate-500">Horizon</dt>
          <dd className="text-slate-800">
            {formatHorizon(run.forecast?.horizon_days)}
            <span className="text-slate-500"> from {formatDate(run.created_at)}</span>
          </dd>
          <dt className="text-slate-500">Target date</dt>
          <dd className="font-mono text-xs tabular-nums leading-5 text-slate-800">{target ?? "—"}</dd>
          <dt className="text-slate-500">Value range</dt>
          <dd className="font-mono text-xs tabular-nums leading-5 text-slate-800">
            {range ?? (
              <span className="font-sans text-slate-500">
                {pending ? "Not produced yet." : "No forecast raster for this section."}
              </span>
            )}
          </dd>
        </dl>
      </div>
      <p className="text-xs text-slate-500">
        {forecast?.value_semantics || "Probability (0–1) that leaf-off has happened by the target date"}
      </p>
    </section>
  );
}
