"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Edit3, Globe2 } from "lucide-react";
import { useApiClient } from "@/admin/hooks/useApiClient";
import { MarkdownRenderer } from "@/components/service-pages/MarkdownRenderer";
import type { ServiceDetailPage } from "@/lib/service-pages";

export default function AdminCustomPagePreview() {
  const { request } = useApiClient();
  const params = useParams<{ pageId: string }>();
  const pageId = params.pageId;
  const [page, setPage] = useState<ServiceDetailPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!pageId) {
      return;
    }

    let cancelled = false;

    async function loadPage() {
      setLoading(true);
      setError("");
      try {
        const response = await request<ServiceDetailPage>("/api/v1/admin/service-pages/pages/" + pageId + "/");
        if (!cancelled) {
          setPage(response);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Unable to load preview.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPage();

    return () => {
      cancelled = true;
    };
  }, [request, pageId]);

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
        Loading preview...
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error || "Preview not found."}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link className="inline-flex items-center gap-2 text-sm font-semibold text-teal-700" href={"/admin/service-pages/pages/" + pageId + "/edit"}>
          <ArrowLeft className="h-4 w-4" />
          Back to editor
        </Link>
        <div className="flex flex-wrap gap-2">
          {page.is_published && page.slug ? (
            <Link
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              href={"/services/" + page.slug}
              target="_blank"
            >
              <Globe2 className="h-4 w-4" />
              Public page
            </Link>
          ) : null}
          <Link
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white transition hover:bg-teal-800"
            href={"/admin/service-pages/pages/" + pageId + "/edit"}
          >
            <Edit3 className="h-4 w-4" />
            Edit
          </Link>
        </div>
      </div>

      <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {page.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt="" className="h-80 w-full object-cover" src={page.cover_image_url} />
        ) : null}
        <div className="p-6 lg:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">Custom page</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">{page.title}</h1>
          {page.short_description ? (
            <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-600">{page.short_description}</p>
          ) : null}
          <div className="mt-8">
            <MarkdownRenderer content={page.markdown_content} />
          </div>
        </div>
      </article>
    </div>
  );
}
