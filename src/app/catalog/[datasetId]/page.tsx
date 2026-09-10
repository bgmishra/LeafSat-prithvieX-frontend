"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { useParams } from "next/navigation";

import { useApiClient } from "@/admin/hooks/useApiClient";

type Dataset = {
  id: number;
  title: string;
  description: string;
  thumbnail_url: string | null;
  cover_image_url: string | null;
};

type DatasetWorkflow = {
  workflow: "service_analysis" | "data_extraction" | null;
  service?: {
    service_id: number;
    service_name: string;
    link: string;
  };
  services: Array<{
    service_id: number;
    service_name: string;
    data_source_id: number;
    link: string;
  }>;
};

export default function DatasetDetailPage() {
  const { request } = useApiClient();
  const { datasetId } = useParams<{ datasetId: string }>();
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [workflow, setWorkflow] = useState<DatasetWorkflow | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadDataset = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [data, workflowData] = await Promise.all([
        request<Dataset>(`/api/v1/datasets/${datasetId}/`),
        request<DatasetWorkflow>(`/api/v1/datasets/${datasetId}/service-details/`),
      ]);
      setDataset(data);
      setWorkflow(workflowData);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load this dataset.");
    } finally {
      setLoading(false);
    }
  }, [datasetId, request]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadDataset(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadDataset]);

  if (loading) {
    return <main className="min-h-screen bg-white px-5 py-12 text-center text-sm text-slate-500">Loading dataset…</main>;
  }

  if (error || !dataset) {
    return (
      <main className="min-h-screen bg-white px-5 py-12">
        <div className="mx-auto max-w-4xl">
          <Link className="inline-flex items-center gap-2 text-sm font-semibold text-teal-700 hover:text-teal-900" href="/catalog">
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Back to catalog
          </Link>
          <p className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error || "Dataset not found."}</p>
        </div>
      </main>
    );
  }

  const coverImage = dataset.cover_image_url ?? dataset.thumbnail_url;

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <section className="relative isolate min-h-[22rem] overflow-hidden bg-slate-900 sm:min-h-[30rem]">
        {coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt="" className="absolute inset-0 h-full w-full object-cover" src={coverImage} />
        ) : (
          <div className="absolute inset-0 bg-[linear-gradient(135deg,#0f766e,#164e63)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/35 to-slate-950/20" />

        <div className="relative mx-auto flex min-h-[22rem] max-w-6xl flex-col justify-between px-5 py-7 sm:min-h-[30rem] sm:px-8">
          <Link className="inline-flex w-fit items-center gap-2 rounded-md bg-white/15 px-3 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/25 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-slate-900" href="/catalog">
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Back to catalog
          </Link>
          <h1 className="max-w-4xl text-3xl font-bold leading-tight tracking-tight text-white drop-shadow-sm sm:text-5xl">{dataset.title}</h1>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
        <h2 className="text-xl font-bold text-slate-950">Dataset description</h2>
        <article className="legal-document legal-document--light mt-5">
          <ReactMarkdown rehypePlugins={[rehypeSanitize]} remarkPlugins={[remarkGfm]}>
            {dataset.description || "No description has been provided for this dataset."}
          </ReactMarkdown>
        </article>

        {workflow?.workflow === "service_analysis" && workflow.service ? (
          <section className="mt-10 rounded-xl bg-teal-50 p-6 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">Analysis available</p>
            <h2 className="mt-2 text-xl font-bold text-slate-950">Analyze this dataset with {workflow.service.service_name}</h2>
            <Link className="mt-5 inline-flex items-center gap-2 rounded-lg bg-teal-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2" href={workflow.service.link}>
              Open service analysis <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </section>
        ) : null}

        {workflow?.workflow === "data_extraction" && workflow.services.length > 0 ? (
          <section className="mt-10 rounded-xl bg-sky-50 p-6 sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-700">Data extraction available</p>
            <h2 className="mt-2 text-xl font-bold text-slate-950">Choose a service to extract this dataset</h2>
            <p className="mt-1 text-sm text-slate-600">{workflow.services.length} extraction {workflow.services.length === 1 ? "service is" : "services are"} available.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {workflow.services.map((service) => (
                <Link className="inline-flex min-h-12 items-center justify-between gap-3 rounded-lg border-2 border-teal-700 bg-teal-50 px-5 py-3 text-sm font-bold text-teal-800 shadow-sm transition hover:bg-teal-100 hover:text-teal-950 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2" href={service.link} key={`${service.service_id}-${service.data_source_id}`}>
                  <span>Extract {service.service_name}</span>
                  <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}