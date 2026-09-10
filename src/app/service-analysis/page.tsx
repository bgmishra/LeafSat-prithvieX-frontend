import { Suspense } from "react";

import { ServiceAnalysisApp } from "@/components/service-analysis/ServiceAnalysisApp";

export default function ServiceAnalysisPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-white p-8 text-sm text-slate-500">Loading service analysis…</main>}>
      <ServiceAnalysisApp />
    </Suspense>
  );
}
