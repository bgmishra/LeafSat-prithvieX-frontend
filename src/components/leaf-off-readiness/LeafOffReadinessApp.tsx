"use client";

import { ToastProvider } from "@/admin/components/ToastProvider";
import { LeafOffRunModelWorkspace } from "./LeafOffRunModelWorkspace";

/**
 * Leaf-Off Readiness "Run Model" page (also the /leaf-off-readiness landing).
 * Multi-selects approved sections and starts readiness runs. Leaf-Off Forecast
 * reuses the same workspace with its own product config and a horizon control.
 */
export function LeafOffReadinessApp() {
  return (
    <ToastProvider>
      <LeafOffRunModelWorkspace />
    </ToastProvider>
  );
}
