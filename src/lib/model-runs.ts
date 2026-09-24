"use client";

import { apiRequest } from "@/api/client";
import type { RailwaySection } from "@/lib/sections";

/**
 * Leaf-Off Readiness model runs.
 *
 * Shapes mirror the backend's ModelRun* / RunnableSection* serializers
 * (leafsat/serializers.py). A run is started for a set of approved sections,
 * processed in the background, and each section gets its own result carrying
 * the scenes used and WMS layers served through the API's authenticated proxy.
 */

const MODEL_RUNS_URL = "/api/v1/model-runs/";

export type ModelType = "leaf_off_readiness" | "leaf_off_forecast";

export type ModelRunStatus = "queued" | "running" | "succeeded" | "failed" | "partially_failed";

/** A section's status inside a run. There is no partial state per section. */
export type ModelRunResultStatus = "queued" | "running" | "succeeded" | "failed";

export const MODEL_RUN_STATUS_LABELS: Record<ModelRunStatus, string> = {
  queued: "Queued",
  running: "Running",
  succeeded: "Succeeded",
  failed: "Failed",
  partially_failed: "Partially failed",
};

/** Runs in these states are still moving and are worth polling. */
export const ACTIVE_RUN_STATUSES: ModelRunStatus[] = ["queued", "running"];

export const FINISHED_RUN_STATUSES: ModelRunStatus[] = ["succeeded", "failed", "partially_failed"];

/** Server default for `GET /model-runs/` (ModelRunPagination.page_size). */
export const MODEL_RUNS_PAGE_SIZE = 20;

/** The server caps one run at this many sections. */
export const MAX_SECTIONS_PER_RUN = 200;

export function isActiveRunStatus(status: string | null | undefined) {
  return status === "queued" || status === "running";
}

// ---------------------------------------------------------------------------
// Runnable sections
// ---------------------------------------------------------------------------

export type ActiveRunSummary = {
  id: number;
  status: "queued" | "running";
  created_at: string | null;
};

export type LastRunSummary = {
  id: number;
  status: "succeeded" | "failed" | "partially_failed";
  created_at: string | null;
  finished_at: string | null;
};

/** An approved, non-archived section, plus its run history for this model. */
export type RunnableSection = RailwaySection & {
  /** Newest queued/running run covering this section, or null. */
  active_run: ActiveRunSummary | null;
  /** Newest finished run covering this section, or null. */
  last_run: LastRunSummary | null;
};

// ---------------------------------------------------------------------------
// Runs and results
// ---------------------------------------------------------------------------

export type WmsLayerInfo = {
  /** The API's WMS proxy for this layer. Use it as-is; never build it. */
  url: string;
  /** `workspace:layer`. The proxy pins it server-side, but OL wants LAYERS. */
  layer: string;
};

export type SceneInfo = {
  item_id: string | null;
  datetime: string | null;
  cloud_cover: number | null;
  wms: WmsLayerInfo | null;
};

export type ReadinessInfo = {
  is_synthetic: boolean;
  value_min: number | null;
  value_max: number | null;
  /** e.g. "1.0 = ready (leaf-off), 0.0 = not ready". */
  value_semantics: string;
  wms: WmsLayerInfo | null;
};

/**
 * Leaf-Off Forecast output for one section: the probability (0–1) that leaf-off
 * has happened by the run's target date. Null on readiness results.
 */
export type ForecastInfo = {
  is_synthetic: boolean;
  value_min: number | null;
  value_max: number | null;
  /** e.g. "Probability (0–1) that leaf-off has happened by the target date". */
  value_semantics: string;
  /** "YYYY-MM-DD". */
  target_date: string | null;
  wms: WmsLayerInfo | null;
};

/** [minx, miny, maxx, maxy] in EPSG:4326. */
export type LonLatBbox = [number, number, number, number];

export type ModelRunResult = {
  id: number;
  /** The section's id. */
  section: number;
  section_label: string;
  section_railway_id: string;
  section_railway_name: string;
  section_start_name: string;
  section_end_name: string;
  status: ModelRunResultStatus;
  status_label: string;
  /** "" unless the section failed. */
  error_message: string;
  is_synthetic: boolean;
  sentinel2: SceneInfo;
  landsat: SceneInfo;
  readiness: ReadinessInfo;
  /** Forecast runs only; null (or absent on older payloads) for readiness. */
  forecast?: ForecastInfo | null;
  bbox: LonLatBbox | null;
  started_at: string | null;
  finished_at: string | null;
};

/** Detail view only: the result plus the section outline (GeoJSON MultiPolygon, 4326). */
export type ModelRunResultDetail = ModelRunResult & {
  section_polygon: unknown | null;
};

export type ModelRunResultCounts = Record<ModelRunResultStatus, number>;

/** How scenes are searched: the backend's LEAF_OFF_* settings, recorded on each run when it starts. */
export type SceneSearch = {
  lookback_days: number;
  /** Scenes must be under this cloud cover, in percent. */
  max_cloud: number;
  /** When no Landsat pass is under `max_cloud`, the latest pass at any cover is used. */
  landsat_any_cloud_fallback: boolean;
};

/** What a forecast run was asked for. Null on readiness runs. */
export type RunForecast = {
  horizon_days: number;
  /** "YYYY-MM-DD": run creation date (UTC) + horizon. */
  target_date: string;
};

/** `GET /model-runs/forecast-options/`. */
export type ForecastOptions = {
  horizons: number[];
  default_horizon: number;
};

/** Offered when the options endpoint is unreachable; mirrors the server's choices. */
export const FALLBACK_FORECAST_OPTIONS: ForecastOptions = { horizons: [7, 14], default_horizon: 14 };

type ModelRunBase = {
  id: number;
  organization: number;
  organization_name: string;
  model_type: ModelType;
  model_type_label: string;
  status: ModelRunStatus;
  status_label: string;
  is_finished: boolean;
  created_by_name: string | null;
  created_by_email: string | null;
  celery_task_id: string;
  error_message: string;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  section_count: number;
  result_counts: ModelRunResultCounts;
  /** Readiness runs only; null for forecast runs (they use no imagery). */
  scene_search: SceneSearch | null;
  /** Forecast runs only; null (or absent on older payloads) for readiness. */
  forecast?: RunForecast | null;
};

/** A run as the paginated list returns it (results without polygons). */
export type ModelRun = ModelRunBase & {
  results: ModelRunResult[];
};

/** A run from `GET /model-runs/{id}/` or the POST response. */
export type ModelRunDetail = ModelRunBase & {
  results: ModelRunResultDetail[];
};

export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type WmsLayerKind = "readiness" | "sentinel2" | "landsat" | "forecast";

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------

function unwrap<T>(payload: T[] | { results?: T[] } | null): T[] {
  return Array.isArray(payload) ? payload : (payload?.results ?? []);
}

/** Approved, non-archived sections the caller may run. Not paginated. */
export async function listRunnableSections({
  modelType = "leaf_off_readiness",
  organization,
}: { modelType?: ModelType; organization?: number } = {}) {
  const params = new URLSearchParams({ model_type: modelType });
  if (organization) {
    params.set("organization", String(organization));
  }

  const payload = await apiRequest<RunnableSection[] | { results?: RunnableSection[] }>(
    `${MODEL_RUNS_URL}runnable-sections/?${params.toString()}`,
    { auth: true },
  );
  return unwrap(payload);
}

/**
 * Start a run. The server answers 202 with the run in detail shape. If the
 * task queue is unreachable it still answers 202 but with `status: "failed"`,
 * so always read the status rather than assuming it queued.
 */
export function createModelRun(
  sectionIds: number[],
  modelType: ModelType = "leaf_off_readiness",
  options: { forecastHorizonDays?: number } = {},
) {
  const body: Record<string, unknown> = { model_type: modelType, section_ids: sectionIds };
  // The server rejects a horizon on readiness runs, so only send it for forecasts.
  if (modelType === "leaf_off_forecast" && options.forecastHorizonDays) {
    body.forecast_horizon_days = options.forecastHorizonDays;
  }
  return apiRequest<ModelRunDetail>(MODEL_RUNS_URL, {
    auth: true,
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** The horizons a forecast run can use, and the default (for the Run page). */
export function getForecastOptions() {
  return apiRequest<ForecastOptions>(`${MODEL_RUNS_URL}forecast-options/`, { auth: true });
}

/** Newest first, paginated (20 per page by default, max 100). */
export function listModelRuns({
  page = 1,
  pageSize,
  status,
  modelType,
  organization,
}: {
  page?: number;
  pageSize?: number;
  status?: ModelRunStatus | ModelRunStatus[];
  modelType?: ModelType;
  organization?: number;
} = {}) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  if (pageSize) {
    params.set("page_size", String(pageSize));
  }
  if (status && (!Array.isArray(status) || status.length > 0)) {
    params.set("status", Array.isArray(status) ? status.join(",") : status);
  }
  if (modelType) {
    params.set("model_type", modelType);
  }
  if (organization) {
    params.set("organization", String(organization));
  }

  return apiRequest<Paginated<ModelRun>>(`${MODEL_RUNS_URL}?${params.toString()}`, { auth: true });
}

/** The scene search a run started now would use (for copy shown before starting one). */
export function getSceneSearch() {
  return apiRequest<SceneSearch>(`${MODEL_RUNS_URL}scene-search/`, { auth: true });
}

/** One run with every result's section outline. 404 if missing or another company's. */
export function getModelRun(id: number) {
  return apiRequest<ModelRunDetail>(`${MODEL_RUNS_URL}${id}/`, { auth: true });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** "RC-A · North Jn → South Jn", falling back to the railway name or id. */
export function resultLabel(result: Pick<
  ModelRunResult,
  "section" | "section_railway_id" | "section_railway_name" | "section_start_name" | "section_end_name"
>) {
  const name = result.section_railway_id || result.section_railway_name || `Section #${result.section}`;
  const from = result.section_start_name;
  const to = result.section_end_name;
  return from && to ? `${name} · ${from} → ${to}` : name;
}

/** Sections that have reached a terminal per-section state. */
export function finishedCount(counts: ModelRunResultCounts) {
  return counts.succeeded + counts.failed;
}

// -- Sharing a section's result with field supervisors ------------------------

/** A field supervisor a result can be shared with. */
export type ShareRecipient = { id: number; full_name: string; email: string };

/** One share of a result, as the person sharing it sees it. */
export type ResultShare = {
  id: number;
  recipient: number;
  recipient_name: string;
  recipient_email: string;
  shared_by_name: string | null;
  note: string;
  shared_at: string;
  /** When the recipient first opened it; null until then (and again after a re-share). */
  viewed_at: string | null;
};

/** A result shared with the current user, for their Shared Model Results page. */
export type SharedResult = {
  id: number;
  note: string;
  shared_at: string;
  viewed_at: string | null;
  is_new: boolean;
  shared_by_name: string | null;
  shared_by_email: string | null;
  run: {
    id: number;
    model_type: ModelType;
    model_type_label: string;
    status: ModelRunStatus;
    created_at: string;
    finished_at: string | null;
    scene_search: SceneSearch | null;
    forecast?: RunForecast | null;
  };
  result: ModelRunResult;
};

const SHARED_RESULTS_URL = "/api/v1/shared-results/";

function resultSharesUrl(runId: number, resultId: number) {
  return `${MODEL_RUNS_URL}${runId}/results/${resultId}/shares/`;
}

/** Active field supervisors in the caller's company. */
export function listShareRecipients() {
  return apiRequest<ShareRecipient[]>(`${MODEL_RUNS_URL}share-recipients/`, { auth: true });
}

export function listResultShares(runId: number, resultId: number) {
  return apiRequest<ResultShare[]>(resultSharesUrl(runId, resultId), { auth: true });
}

/** Share with these field supervisors. Re-sharing refreshes the note and marks it new again. Returns every share. */
export function shareResult(runId: number, resultId: number, recipientIds: number[], note: string) {
  return apiRequest<ResultShare[]>(resultSharesUrl(runId, resultId), {
    auth: true,
    method: "POST",
    body: JSON.stringify({ recipient_ids: recipientIds, note }),
  });
}

export function unshareResult(runId: number, resultId: number, shareId: number) {
  return apiRequest<null>(`${resultSharesUrl(runId, resultId)}${shareId}/`, { auth: true, method: "DELETE" });
}

/** Results shared with the current user, newest first, 20 per page, for one product. */
export function listSharedResults({ page = 1, modelType }: { page?: number; modelType?: ModelType } = {}) {
  const params = new URLSearchParams({ page: String(page) });
  if (modelType) {
    params.set("model_type", modelType);
  }
  return apiRequest<Paginated<SharedResult>>(`${SHARED_RESULTS_URL}?${params.toString()}`, { auth: true });
}

/** How many shares the current user has not opened yet, optionally for one product. */
export function getSharedResultsUnreadCount(modelType?: ModelType) {
  const query = modelType ? `?model_type=${modelType}` : "";
  return apiRequest<{ count: number }>(`${SHARED_RESULTS_URL}unread-count/${query}`, { auth: true });
}

/** Mark the current user's share of this result viewed (no-op if it was never shared with them). */
export function markSharedResultViewedFor(resultId: number) {
  return apiRequest<{ updated: number }>(`${SHARED_RESULTS_URL}mark-viewed-for-result/`, {
    auth: true,
    method: "POST",
    body: JSON.stringify({ result_id: resultId }),
  });
}

export function markSharedResultViewed(shareId: number) {
  return apiRequest<SharedResult>(`${SHARED_RESULTS_URL}${shareId}/mark-viewed/`, { auth: true, method: "POST" });
}
