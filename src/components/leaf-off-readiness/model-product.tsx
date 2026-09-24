"use client";

import { createContext, useContext, type ReactNode } from "react";
import type {
  ModelRun,
  ModelRunDetail,
  ModelRunResult,
  ModelRunResultDetail,
  ModelType,
  SceneSearch,
  SharedResult,
  WmsLayerInfo,
} from "@/lib/model-runs";
import type { ResultsHrefParams } from "./results-routes";
import { READINESS_PRODUCT } from "./readiness-product";

/**
 * A "model product" (Leaf-Off Readiness, Leaf-Off Forecast) as the shared
 * model-run screens see it: which `model_type` to ask the API for, where its
 * pages live, its wording, and the few product-specific table columns.
 *
 * The runs list, run detail, section viewer chrome, share dialog, shared
 * results page and status panel are written once and read this through
 * `useModelProduct()`. Without a provider they fall back to Readiness, so the
 * Readiness pages behave exactly as before.
 */

type RunLike = Pick<ModelRun, "id" | "created_at" | "scene_search"> & Partial<Pick<ModelRun, "forecast">>;

export type ResultColumn = {
  key: string;
  header: string;
  /** Extra classes for the table cell (e.g. "whitespace-nowrap"). */
  cellClassName?: string;
  cell: (result: ModelRunResult, run: RunLike) => ReactNode;
};

/** The product's own raster for a section: what the legend, opacity slider and click-to-read act on. */
export type PrimaryLayerInfo = {
  is_synthetic: boolean;
  value_min: number | null;
  value_max: number | null;
  value_semantics: string;
  wms: WmsLayerInfo | null;
};

export type LegendCopy = {
  /** Figure caption, e.g. "Leaf-off readiness" or "Leaf-off probability by 2026-10-08". */
  title: (targetDate: string | null) => string;
  /** Words for 0, 0.5 and 1. */
  labels: { low: string; mid: string; high: string };
  /** One line under the ramp explaining the scale. */
  caption: string;
};

export type ModelProduct = {
  modelType: ModelType;
  /** Product name, used as the page eyebrow and in dialog titles. */
  name: string;
  runModelPath: string;
  resultsPath: string;
  sharedResultsPath: string;
  resultsHref: (params: ResultsHrefParams) => string;
  /** Primary action on the results list ("Run model"). */
  runActionLabel: string;
  /** "readiness map" / "forecast map", for aria labels, share copy and map states. */
  mapNoun: string;
  primaryLayer: "readiness" | "forecast";
  primaryInfo: (result: ModelRunResult) => PrimaryLayerInfo;
  resultsDescription: string;
  syntheticNoticeBody: string;
  runsList: {
    /** Columns between Status and Time. */
    columns: ResultColumn[];
    /** Extra text for the mobile card line after "Run #n · time". */
    cardMeta: (result: ModelRunResult, run: RunLike) => ReactNode;
    /** Show the run's start time (column and card). Defaults to true. */
    showTime?: boolean;
  };
  runDetail: {
    /** Columns between Status and the action. */
    columns: ResultColumn[];
    /** Extra facts in the run header after "Finished". */
    facts: (run: RunLike) => Array<{ label: string; value: ReactNode }>;
  };
  shared: {
    description: string;
    emptyDescription: string;
    /** Extra text after "Shared by … · Run #n". */
    meta: (item: SharedResult) => string;
  };
  legend: LegendCopy;
  runPage: {
    title: string;
    description: string;
    signInTitle: string;
    /** sessionStorage key for the run followed in the status panel. */
    lastRunStorageKey: string;
    /** Fetch the scene-search settings for the confirm dialog's wording (Readiness only). */
    usesSceneSearch: boolean;
    /** Confirm dialog body before the email sentence. */
    dialogBody: (sceneSearch: SceneSearch | null) => string;
    /** Follows "N of these sections were already run today." */
    ranTodayNote: string;
    syntheticLine: string;
  };
  viewer: {
    /** The primary layer's switch label, e.g. "Readiness map". */
    layerLabel: string;
    /** Its description when available, e.g. "Leaf-off readiness, 0–1". */
    layerDescription: (targetDate: string | null) => string;
    /** Readiness shows Sentinel-2 / Landsat toggles and scene cards; Forecast uses no imagery. */
    hasImagery: boolean;
    /**
     * Replaces the Readiness "raster" section under the layers, e.g. the
     * forecast card (horizon, target date, value range). Omitted = Readiness.
     */
    details?: (result: ModelRunResultDetail, run: ModelRunDetail) => ReactNode;
    /** The chip at the top of the map. Omitted = the Readiness text (section + visible scenes). */
    hudLabel?: (result: ModelRunResultDetail, run: ModelRunDetail) => string;
    /** The date the primary layer refers to (forecast target date), for the legend. */
    targetDate?: (result: ModelRunResultDetail, run: ModelRunDetail) => string | null;
  };
};

const ModelProductContext = createContext<ModelProduct>(READINESS_PRODUCT);

export function ModelProductProvider({ children, product }: { children: ReactNode; product: ModelProduct }) {
  return <ModelProductContext.Provider value={product}>{children}</ModelProductContext.Provider>;
}

export function useModelProduct() {
  return useContext(ModelProductContext);
}

/** A word for a 0–1 value, so the map never relies on colour alone. */
export function bandFor(value: number, labels: LegendCopy["labels"]) {
  if (value < 1 / 3) {
    return labels.low;
  }
  if (value <= 2 / 3) {
    return labels.mid;
  }
  return labels.high;
}
