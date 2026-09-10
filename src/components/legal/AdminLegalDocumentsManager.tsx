"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

import { AdminApiError, useApiClient } from "@/admin/hooks/useApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type LegalDocumentAdmin = {
  id: number;
  title: string;
  slug: string;
  version: string;
  effective_date: string | null;
  content: string;
  is_active: boolean;
  updated_at: string | null;
};

type LegalDocumentForm = Omit<LegalDocumentAdmin, "id" | "updated_at">;

const newDocument = (): LegalDocumentForm => ({
  title: "",
  slug: "",
  version: "1.0",
  effective_date: null,
  content: "",
  is_active: false,
});

function toForm(document: LegalDocumentAdmin): LegalDocumentForm {
  return {
    title: document.title,
    slug: document.slug,
    version: document.version,
    effective_date: document.effective_date,
    content: document.content,
    is_active: document.is_active,
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function AdminLegalDocumentsManager() {
  const { request } = useApiClient();
  const [documents, setDocuments] = useState<LegalDocumentAdmin[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<LegalDocumentForm>(newDocument);
  const [isNew, setIsNew] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  async function loadDocuments(selectId?: number | null) {
    setIsLoading(true);
    try {
      const data = await request<LegalDocumentAdmin[]>("/api/v1/admin/legal-documents/");
      setDocuments(data);
      const nextId = selectId ?? selectedId ?? data[0]?.id ?? null;
      const selected = data.find((document) => document.id === nextId) ?? data[0];
      if (selected) {
        setSelectedId(selected.id);
        setForm(toForm(selected));
        setIsNew(false);
      }
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Unable to load legal documents.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    // Loading is an asynchronous synchronization with the protected API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadDocuments();
    // The API client is stable for the lifetime of this mounted page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function selectDocument(document: LegalDocumentAdmin) {
    setSelectedId(document.id);
    setForm(toForm(document));
    setIsNew(false);
    setMessage(null);
  }

  function startNewDocument() {
    setSelectedId(null);
    setForm(newDocument());
    setIsNew(true);
    setMessage(null);
    setIsError(false);
  }

  async function saveDocument() {
    if (!form.title.trim() || !form.slug.trim() || !form.content.trim()) {
      setIsError(true);
      setMessage("Title, slug, and Markdown content are required.");
      return;
    }

    setIsSaving(true);
    setIsError(false);
    setMessage(null);
    try {
      const saved = await request<LegalDocumentAdmin>(
        isNew ? "/api/v1/admin/legal-documents/" : `/api/v1/admin/legal-documents/${selectedId}/`,
        {
          method: isNew ? "POST" : "PATCH",
          body: JSON.stringify({ ...form, effective_date: form.effective_date || null }),
        },
      );
      setMessage("Legal document saved successfully.");
      await loadDocuments(saved.id);
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof AdminApiError || error instanceof Error
          ? error.message
          : "Unable to save the legal document.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteDocument() {
    if (!selectedId || !window.confirm("Delete this legal document permanently?")) {
      return;
    }

    setIsSaving(true);
    try {
      await request<void>(`/api/v1/admin/legal-documents/${selectedId}/`, { method: "DELETE" });
      setMessage("Legal document deleted.");
      setSelectedId(null);
      setForm(newDocument());
      await loadDocuments(null);
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Unable to delete the legal document.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading legal documents...</p>;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="h-fit rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <Button className="w-full" onClick={startNewDocument} type="button">Create legal document</Button>
        <div className="mt-3 grid gap-1">
          {documents.map((document) => (
            <button
              className={`rounded-md px-3 py-3 text-left transition ${document.id === selectedId && !isNew ? "bg-teal-50 text-teal-950" : "hover:bg-slate-50"}`}
              key={document.id}
              onClick={() => selectDocument(document)}
              type="button"
            >
              <span className="block truncate text-sm font-semibold">{document.title}</span>
              <span className="mt-1 block text-xs text-slate-500">/{document.slug} · {document.is_active ? "Published" : "Draft"}</span>
            </button>
          ))}
          {!documents.length ? <p className="px-3 py-4 text-sm text-slate-500">No legal documents yet.</p> : null}
        </div>
      </aside>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-5 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-slate-800">Title
            <Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-800">Custom slug
            <Input value={form.slug} onChange={(event) => setForm({ ...form, slug: slugify(event.target.value) })} placeholder="privacy-policy" />
            <span className="text-xs font-normal text-slate-500">Public URL: /legal/{form.slug || "your-slug"}</span>
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-800">Version
            <Input value={form.version} onChange={(event) => setForm({ ...form, version: event.target.value })} />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-800">Effective date
            <Input type="date" value={form.effective_date ?? ""} onChange={(event) => setForm({ ...form, effective_date: event.target.value || null })} />
          </label>
        </div>

        <label className="mt-5 flex items-center gap-3 text-sm font-semibold text-slate-800">
          <input checked={form.is_active} className="h-4 w-4 accent-teal-700" onChange={(event) => setForm({ ...form, is_active: event.target.checked })} type="checkbox" />
          Publish this document
        </label>
        <p className="mt-1 text-xs text-slate-500">Only one published version can exist for each slug.</p>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="legal-content">Markdown content</Label>
            <Textarea id="legal-content" className="min-h-[34rem] font-mono text-sm leading-6 text-black" value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} />
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="mb-3 text-sm font-semibold text-slate-800">Live preview</p>
            <article className="legal-document legal-document--light min-h-[31rem] rounded-md border border-slate-200 bg-white p-5">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>{form.content}</ReactMarkdown>
            </article>
          </div>
        </div>

        {message ? <p className={`mt-4 text-sm ${isError ? "text-red-700" : "text-emerald-700"}`} role="status">{message}</p> : null}
        <div className="mt-5 flex flex-wrap justify-end gap-3">
          {!isNew && selectedId ? <Button disabled={isSaving} onClick={deleteDocument} type="button" variant="outline">Delete</Button> : null}
          <Button disabled={isSaving} onClick={saveDocument} type="button">{isSaving ? "Saving..." : isNew ? "Create document" : "Save changes"}</Button>
        </div>
      </section>
    </div>
  );
}
