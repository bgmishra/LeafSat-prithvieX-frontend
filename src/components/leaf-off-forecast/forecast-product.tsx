import { isActiveRunStatus, type ModelRunResult } from "@/lib/model-runs";
import type { ModelProduct, PrimaryLayerInfo } from "@/components/leaf-off-readiness/model-product";
import { makeResultsHref } from "@/components/leaf-off-readiness/results-routes";
import { ForecastInfoCard } from "./ForecastInfoCard";
import { forecastTargetDate, formatHorizon } from "./forecast-dates";

export const FORECAST_BASE_PATH = "/leaf-off-forecast";
export const FORECAST_RUN_MODEL_PATH = "/leaf-off-forecast/run-model";
export const FORECAST_RESULTS_PATH = "/leaf-off-forecast/results";
export const FORECAST_SHARED_RESULTS_PATH = "/leaf-off-forecast/shared-results";

export const FORECAST_BAND_LABELS = { low: "Unlikely", mid: "Possible", high: "Likely" } as const;

const EMPTY_FORECAST: PrimaryLayerInfo = {
  is_synthetic: false,
  value_min: null,
  value_max: null,
  value_semantics: "Probability (0–1) that leaf-off has happened by the target date",
  wms: null,
};

function forecastInfo(result: Pick<ModelRunResult, "forecast">) {
  return result.forecast ?? EMPTY_FORECAST;
}

function TargetDate({ value }: { value: string | null }) {
  return value ? (
    <time className="whitespace-nowrap font-mono text-xs tabular-nums text-slate-700" dateTime={value}>
      {value}
    </time>
  ) : (
    <span className="text-xs text-slate-500">—</span>
  );
}

function ProbabilityRange({ result }: { result: ModelRunResult }) {
  const info = forecastInfo(result);
  if (typeof info.value_min === "number" && typeof info.value_max === "number") {
    return (
      <span className="whitespace-nowrap font-mono text-xs tabular-nums text-slate-700">
        {info.value_min.toFixed(2)} – {info.value_max.toFixed(2)}
      </span>
    );
  }
  return (
    <span className="text-xs text-slate-500">
      {isActiveRunStatus(result.status) ? "Waiting…" : result.status === "failed" ? "—" : "No values"}
    </span>
  );
}

/**
 * Leaf-Off Forecast: the probability (0–1) that leaf-off will have happened by
 * the run's target date (creation date + horizon). No satellite imagery.
 */
export const FORECAST_PRODUCT: ModelProduct = {
  modelType: "leaf_off_forecast",
  name: "Leaf-Off Forecast",
  runModelPath: FORECAST_RUN_MODEL_PATH,
  resultsPath: FORECAST_RESULTS_PATH,
  sharedResultsPath: FORECAST_SHARED_RESULTS_PATH,
  resultsHref: makeResultsHref(FORECAST_RESULTS_PATH),
  runActionLabel: "Run forecast",
  mapNoun: "forecast map",
  primaryLayer: "forecast",
  primaryInfo: forecastInfo,
  resultsDescription:
    "Forecast runs your company has started, newest first. Open a section to see how likely leaf-off is by its target date.",
  syntheticNoticeBody:
    "Forecast maps in this run are generated test surfaces, not model predictions. Don't use them for operational decisions.",
  runsList: {
    columns: [
      {
        key: "horizon",
        header: "Horizon",
        cellClassName: "whitespace-nowrap",
        cell: (_result, run) => formatHorizon(run.forecast?.horizon_days),
      },
    ],
    cardMeta: (_result, run) => formatHorizon(run.forecast?.horizon_days),
    showTime: false,
  },
  runDetail: {
    columns: [
      {
        key: "target",
        header: "Target date",
        cell: (result, run) => <TargetDate value={forecastTargetDate(run, result)} />,
      },
      { key: "range", header: "Probability range", cell: (result) => <ProbabilityRange result={result} /> },
    ],
    facts: (run) => [
      { label: "Horizon", value: formatHorizon(run.forecast?.horizon_days) },
      {
        label: "Forecast for",
        value: <span className="font-mono tabular-nums">{forecastTargetDate(run) ?? "—"}</span>,
      },
    ],
  },
  shared: {
    description: "Section leaf-off forecasts your colleagues have sent you. Open one to inspect it on the map.",
    emptyDescription:
      "When an engineer or your super admin shares a section's leaf-off forecast with you, it will appear here. You'll also get a notification and an email.",
    meta: (item) => {
      const target = forecastTargetDate(item.run, item.result);
      if (!target) {
        return "";
      }
      const horizon = item.run.forecast?.horizon_days;
      return ` · Forecast for ${target}${horizon ? ` (${formatHorizon(horizon)})` : ""}`;
    },
  },
  legend: {
    title: (targetDate) => (targetDate ? `Leaf-off probability by ${targetDate}` : "Leaf-off probability"),
    labels: FORECAST_BAND_LABELS,
    caption: "Probability, 0–1 · 1 = leaf-off very likely",
  },
  runPage: {
    title: "Run forecast model",
    description:
      "Choose approved train sections and forecast how likely each one is to have reached leaf-off by a target date.",
    signInTitle: "Sign in to run Leaf-Off Forecast",
    lastRunStorageKey: "leafsat:last-forecast-run",
    usesSceneSearch: false,
    dialogBody: () =>
      "Each section is processed separately and gets a map of the probability that leaf-off has happened by the target date. This usually takes a minute or two per section.",
    ranTodayNote: "The new run produces a separate forecast.",
    syntheticLine: "Forecast probabilities are synthetic test output for now.",
  },
  viewer: {
    layerLabel: "Forecast probability",
    layerDescription: (targetDate) =>
      targetDate ? `Chance of leaf-off by ${targetDate}, 0–1` : "Chance of leaf-off by the target date, 0–1",
    hasImagery: false,
    details: (result, run) => <ForecastInfoCard result={result} run={run} />,
    hudLabel: (result, run) => {
      const name = result.section_railway_id || result.section_label;
      const target = forecastTargetDate(run, result);
      return target ? `${name} · Leaf-off probability by ${target}` : name;
    },
    targetDate: (result, run) => forecastTargetDate(run, result),
  },
};
