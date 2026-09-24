import { formatDate } from "@/lib/format";
import { isActiveRunStatus, type ModelRunResult, type SceneInfo } from "@/lib/model-runs";
import { READINESS_END_LABELS } from "@/lib/readiness";
import type { ModelProduct } from "./model-product";
import { RESULTS_PATH, RUN_MODEL_PATH, SHARED_RESULTS_PATH, resultsHref } from "./results-routes";

function sceneDate(value: string | null) {
  return value ? formatDate(value) : "—";
}

function sceneSummary(scene: SceneInfo, pending: boolean) {
  if (scene.datetime) {
    const cloud = typeof scene.cloud_cover === "number" ? ` · ${scene.cloud_cover.toFixed(1)}% cloud` : "";
    return (
      <span className="whitespace-nowrap font-mono text-xs tabular-nums text-slate-700" title={scene.item_id ?? undefined}>
        {formatDate(scene.datetime)}
        {cloud}
      </span>
    );
  }
  return <span className="text-xs text-slate-500">{pending ? "Waiting…" : "No scene found"}</span>;
}

const pendingOf = (result: ModelRunResult) => isActiveRunStatus(result.status);

/** Leaf-Off Readiness: the reference product. Every value here is the wording the pages already used. */
export const READINESS_PRODUCT: ModelProduct = {
  modelType: "leaf_off_readiness",
  name: "Leaf-Off Readiness",
  runModelPath: RUN_MODEL_PATH,
  resultsPath: RESULTS_PATH,
  sharedResultsPath: SHARED_RESULTS_PATH,
  resultsHref,
  runActionLabel: "Run model",
  mapNoun: "readiness map",
  primaryLayer: "readiness",
  primaryInfo: (result) => result.readiness,
  resultsDescription:
    "Runs your company has started, newest first. Open a run to inspect each section's readiness map.",
  syntheticNoticeBody:
    "Readiness maps in this run are generated test surfaces, not model predictions. Don't use them for operational decisions.",
  runsList: {
    columns: [
      {
        key: "sentinel2",
        header: "Sentinel-2",
        cellClassName: "whitespace-nowrap",
        cell: (result) => sceneDate(result.sentinel2.datetime),
      },
      {
        key: "landsat",
        header: "Landsat",
        cellClassName: "whitespace-nowrap",
        cell: (result) => sceneDate(result.landsat.datetime),
      },
    ],
    cardMeta: (result) =>
      `S2 ${sceneDate(result.sentinel2.datetime)} · Landsat ${sceneDate(result.landsat.datetime)}`,
  },
  runDetail: {
    columns: [
      { key: "sentinel2", header: "Sentinel-2", cell: (result) => sceneSummary(result.sentinel2, pendingOf(result)) },
      { key: "landsat", header: "Landsat", cell: (result) => sceneSummary(result.landsat, pendingOf(result)) },
    ],
    facts: () => [],
  },
  shared: {
    description: "Section readiness maps your colleagues have sent you. Open one to inspect it on the map.",
    emptyDescription:
      "When an engineer or your super admin shares a section's readiness map with you, it will appear here. You'll also get a notification and an email.",
    meta: (item) => (item.result.sentinel2.datetime ? ` · Sentinel-2 ${formatDate(item.result.sentinel2.datetime)}` : ""),
  },
  legend: {
    title: () => "Leaf-off readiness",
    labels: READINESS_END_LABELS,
    caption: "Readiness index, 0–1 · 1 = ready for leaf-off",
  },
  runPage: {
    title: "Run model",
    description: "Choose approved train sections and generate a leaf-off readiness map for each one.",
    signInTitle: "Sign in to run Leaf-Off Readiness",
    lastRunStorageKey: "leafsat:last-readiness-run",
    usesSceneSearch: true,
    dialogBody: (search) =>
      `Each section is processed separately. The latest Sentinel-2 and Landsat scenes${
        search ? ` from the last ${search.lookback_days} days with under ${search.max_cloud}% cloud` : ""
      } are fetched and a readiness map is produced. This usually takes a few minutes per section.`,
    ranTodayNote: "The new run will likely use the same scenes.",
    syntheticLine: "Readiness values are synthetic test output for now.",
  },
  viewer: {
    layerLabel: "Readiness map",
    layerDescription: () => "Leaf-off readiness, 0–1",
    hasImagery: true,
  },
};
