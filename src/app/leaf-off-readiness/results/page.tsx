import { Suspense } from "react";
import { ToastProvider } from "@/admin/components/ToastProvider";
import { ModelResultsWorkspace } from "@/components/leaf-off-readiness/ModelResultsWorkspace";

/**
 * Leaf-Off Readiness results. The view is driven by search params:
 *   (none)               runs list (`?page=` / `?filter=` optional)
 *   ?run=<id>            run detail
 *   ?run=<id>&section=<id> section viewer (section = the section's id)
 * The completion email links to `?run=<id>`.
 */
export default function LeafOffReadinessResultsPage() {
  return (
    <ToastProvider>
      {/* useSearchParams renders client-side up to the nearest Suspense boundary. */}
      <Suspense
        fallback={<div className="p-6 text-center text-sm text-slate-500">Loading model results…</div>}
      >
        <ModelResultsWorkspace />
      </Suspense>
    </ToastProvider>
  );
}
