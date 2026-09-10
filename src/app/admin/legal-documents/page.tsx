"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Edit3, Plus, Search } from "lucide-react";

import { useApiClient } from "@/admin/hooks/useApiClient";

type LegalDocument = {
  id: number;
  title: string;
  slug: string;
  version: string;
  effective_date: string | null;
  is_active: boolean;
  updated_at: string | null;
};

export default function LegalDocumentsAdminPage() {
  const { request } = useApiClient();
  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDocuments() {
      try {
        const data = await request<LegalDocument[]>("/api/v1/admin/legal-documents/");
        if (!cancelled) setDocuments(data);
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Unable to load legal documents.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadDocuments();
    return () => { cancelled = true; };
  }, [request]);

  const filteredDocuments = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return documents;
    return documents.filter((document) => [document.title, document.slug, document.version]
      .some((field) => field.toLowerCase().includes(value)));
  }, [documents, query]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">Legal CMS</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Legal Documents</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Create, edit, preview, and publish custom Markdown legal pages with their own public slugs.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Link className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white transition hover:bg-teal-800" href="/admin/legal-documents/new">
            <Plus className="h-4 w-4" /> Create legal document
          </Link>
          <label className="relative sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="min-h-11 w-full rounded-md border border-slate-300 bg-white pl-10 pr-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" onChange={(event) => setQuery(event.target.value)} placeholder="Search documents" value={query} />
          </label>
        </div>
      </header>

      {error ? <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr><th className="px-4 py-3">Document</th><th className="px-4 py-3">Version</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Updated</th><th className="px-4 py-3 text-right">Action</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={5}>Loading legal documents...</td></tr> : null}
              {!loading && filteredDocuments.length === 0 ? <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={5}>No legal documents found. Create your first document to get started.</td></tr> : null}
              {filteredDocuments.map((document) => (
                <tr className="align-top" key={document.id}>
                  <td className="px-4 py-4"><p className="font-semibold text-slate-950">{document.title}</p><p className="mt-1 text-xs text-slate-500">/legal/{document.slug}</p></td>
                  <td className="px-4 py-4 text-slate-600">{document.version}</td>
                  <td className="px-4 py-4"><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${document.is_active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>{document.is_active ? "Published" : "Draft"}</span></td>
                  <td className="px-4 py-4 text-slate-600">{document.updated_at ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(document.updated_at)) : "-"}</td>
                  <td className="px-4 py-4 text-right"><Link className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white transition hover:bg-teal-800" href={`/admin/legal-documents/${document.id}/edit`}><Edit3 className="h-4 w-4" /> Edit</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
