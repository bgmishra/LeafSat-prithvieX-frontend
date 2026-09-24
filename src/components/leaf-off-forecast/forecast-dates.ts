import type { ModelRunResult, RunForecast } from "@/lib/model-runs";

/** "+14 days". */
export function formatHorizon(days: number | null | undefined) {
  if (!days) {
    return "—";
  }
  return `+${days} day${days === 1 ? "" : "s"}`;
}

/**
 * The target date a run started now would get: today's UTC date plus the
 * horizon, as "YYYY-MM-DD" (the server computes it the same way on create).
 */
export function targetDateFor(horizonDays: number, from = new Date()) {
  const date = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate() + horizonDays));
  return date.toISOString().slice(0, 10);
}

/** "Thu 8 Oct", for a friendlier echo next to the ISO date. Parsed as a UTC calendar day. */
export function formatTargetWeekday(isoDate: string | null | undefined) {
  if (!isoDate) {
    return "";
  }
  const date = new Date(`${isoDate}T00:00:00Z`);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString(undefined, { day: "numeric", month: "short", timeZone: "UTC", weekday: "short" });
}

/** The run's target date, falling back to the result's copy of it. */
export function forecastTargetDate(
  run: { forecast?: RunForecast | null } | null | undefined,
  result?: Pick<ModelRunResult, "forecast"> | null,
) {
  return run?.forecast?.target_date ?? result?.forecast?.target_date ?? null;
}
