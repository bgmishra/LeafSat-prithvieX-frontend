import type { ModelRunResultStatus, ModelRunStatus } from "@/lib/model-runs";

export const RESULTS_PATH = "/leaf-off-readiness/results";
export const RUN_MODEL_PATH = "/leaf-off-readiness/run-model";
export const SHARED_RESULTS_PATH = "/leaf-off-readiness/shared-results";

/** The focus target after an in-app navigation between results views. */
export const RESULTS_HEADING_ID = "model-results-heading";

export type RunsFilterKey = "all" | "active" | "finished" | "attention";

/**
 * `statuses` narrows the runs the server returns (so pagination counts match);
 * `resultStatuses` then narrows the section rows listed inside those runs, since
 * a partially failed run still holds sections that succeeded. Empty = no filter.
 */
export const RUN_FILTERS: Array<{
  key: RunsFilterKey;
  label: string;
  statuses: ModelRunStatus[];
  resultStatuses: ModelRunResultStatus[];
}> = [
  { key: "all", label: "All", statuses: [], resultStatuses: [] },
  { key: "active", label: "Active", statuses: ["queued", "running"], resultStatuses: ["queued", "running"] },
  {
    key: "finished",
    label: "Finished",
    statuses: ["succeeded", "failed", "partially_failed"],
    resultStatuses: ["succeeded", "failed"],
  },
  { key: "attention", label: "Needs attention", statuses: ["failed", "partially_failed"], resultStatuses: ["failed"] },
];

export function parseFilter(value: string | null): RunsFilterKey {
  return value === "active" || value === "finished" || value === "attention" ? value : "all";
}

export type ResultsHrefParams = { run?: number; section?: number; page?: number; filter?: RunsFilterKey };

/**
 * Results URLs: none = runs list, `?run=` = run detail, `?run=&section=` =
 * section viewer (`section` is the section's id). The completion email links
 * to `?run=<id>`. Each product has its own results path; the query shape is shared.
 */
export function makeResultsHref(resultsPath: string) {
  return (params: ResultsHrefParams) => {
    const search = new URLSearchParams();
    if (params.run) {
      search.set("run", String(params.run));
    }
    if (params.section) {
      search.set("section", String(params.section));
    }
    if (params.page && params.page > 1) {
      search.set("page", String(params.page));
    }
    if (params.filter && params.filter !== "all") {
      search.set("filter", params.filter);
    }
    const query = search.toString();
    return query ? `${resultsPath}?${query}` : resultsPath;
  };
}

/** Leaf-Off Readiness results URLs. Product-aware components use `useModelProduct().resultsHref`. */
export const resultsHref = makeResultsHref(RESULTS_PATH);
