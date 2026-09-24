"use client";

import { ModelProductProvider } from "@/components/leaf-off-readiness/model-product";
import { SharedResultsWorkspace } from "@/components/leaf-off-readiness/SharedResultsWorkspace";
import { FORECAST_PRODUCT } from "./forecast-product";

/** Forecast results shared with the current user (`?model_type=leaf_off_forecast`). */
export function ForecastSharedResultsWorkspace() {
  return (
    <ModelProductProvider product={FORECAST_PRODUCT}>
      <SharedResultsWorkspace />
    </ModelProductProvider>
  );
}
