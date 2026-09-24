"use client";

import { ToastProvider } from "@/admin/components/ToastProvider";
import { ModelProductProvider } from "@/components/leaf-off-readiness/model-product";
import { FORECAST_PRODUCT } from "./forecast-product";
import { ForecastRunModelWorkspace } from "./ForecastRunModelWorkspace";

/** Leaf-Off Forecast "Run Forecast Model" page (also the /leaf-off-forecast landing). */
export function LeafOffForecastApp() {
  return (
    <ToastProvider>
      <ModelProductProvider product={FORECAST_PRODUCT}>
        <ForecastRunModelWorkspace />
      </ModelProductProvider>
    </ToastProvider>
  );
}
