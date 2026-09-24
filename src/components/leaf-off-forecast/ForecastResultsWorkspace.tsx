"use client";

import { ModelProductProvider } from "@/components/leaf-off-readiness/model-product";
import { ModelResultsWorkspace } from "@/components/leaf-off-readiness/ModelResultsWorkspace";
import { FORECAST_PRODUCT } from "./forecast-product";

/** Forecast results: the shared runs list → run detail → section viewer, scoped to forecast runs. */
export function ForecastResultsWorkspace() {
  return (
    <ModelProductProvider product={FORECAST_PRODUCT}>
      <ModelResultsWorkspace />
    </ModelProductProvider>
  );
}
