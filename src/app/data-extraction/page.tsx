import { Suspense } from "react";

import { DataExtraction } from "@/components/service-analysis/DataExtraction";

export default function DataExtractionPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-white p-8 text-sm text-slate-500">Loading data extraction…</main>}>
      <DataExtraction />
    </Suspense>
  );
}
