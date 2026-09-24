import { Suspense } from "react";
import { ToastProvider } from "@/admin/components/ToastProvider";
import { ForecastResultsWorkspace } from "@/components/leaf-off-forecast/ForecastResultsWorkspace";

/**
 * Leaf-Off Forecast results. Same search params as Readiness:
 *   (none)                 runs list (`?page=` / `?filter=` optional)
 *   ?run=<id>              run detail
 *   ?run=<id>&section=<id> section viewer (section = the section's id)
 * Completion and share notifications/emails for forecast runs link here.
 */
export default function LeafOffForecastResultsPage() {
  return (
    <ToastProvider>
      {/* useSearchParams renders client-side up to the nearest Suspense boundary. */}
      <Suspense
        fallback={<div className="p-6 text-center text-sm text-slate-500">Loading forecast results…</div>}
      >
        <ForecastResultsWorkspace />
      </Suspense>
    </ToastProvider>
  );
}
