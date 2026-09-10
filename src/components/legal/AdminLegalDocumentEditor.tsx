"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AdminApiError, useApiClient } from "@/admin/hooks/useApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LegalMarkdownEditor } from "@/components/legal/LegalMarkdownEditor";

type LegalDocument = {
  id: number;
  title: string;
  slug: string;
  version: string;
  effective_date: string | null;
  content: string;
  is_active: boolean;
};

type LegalDocumentForm = Omit<LegalDocument, "id">;

const emptyDocument: LegalDocumentForm = {
  title: "",
  slug: "",
  version: "1.0",
  effective_date: null,
  content: "",
  is_active: false,
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function AdminLegalDocumentEditor({ documentId }: { documentId?: number }) {
  const { request } = useApiClient();
  const [form, setForm] = useState<LegalDocumentForm>(emptyDocument);
  const [loading, setLoading] = useState(Boolean(documentId));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!documentId) {
      return;
    }

    let cancelled = false;

    async function loadDocument() {
      try {
        const document = await request<LegalDocument>(`/api/v1/admin/legal-documents/${documentId}/`);
        if (!cancelled) {
          setForm({
            title: document.title,
            slug: document.slug,
            version: document.version,
            effective_date: document.effective_date,
            content: document.content,
            is_active: document.is_active,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : "Unable to load legal document.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDocument();

    return () => {
      cancelled = true;
    };
  }, [documentId, request]);

  function updateForm(values: Partial<LegalDocumentForm>) {
    setForm((current) => ({ ...current, ...values }));
  }

  async function saveDocument() {
    if (!form.title.trim() || !form.slug.trim() || !form.content.trim()) {
      setMessage("Title, custom slug, and Markdown content are required.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const saved = await request<LegalDocument>(
        documentId ? `/api/v1/admin/legal-documents/${documentId}/` : "/api/v1/admin/legal-documents/",
        {
          method: documentId ? "PATCH" : "POST",
          body: JSON.stringify({
            ...form,
            effective_date: form.effective_date || null,
          }),
        },
      );
      window.location.assign(`/admin/legal-documents/${saved.id}/edit`);
    } catch (error) {
      setMessage(
        error instanceof AdminApiError || error instanceof Error
          ? error.message
          : "Unable to save legal document.",
      );
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading legal document...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-slate-800">
          Title
          <Input
            onChange={(event) => updateForm({ title: event.target.value })}
            placeholder="Privacy Policy"
            value={form.title}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-800">
          Custom slug
          <Input
            onChange={(event) => updateForm({ slug: slugify(event.target.value) })}
            placeholder="privacy-policy"
            value={form.slug}
          />
          <span className="text-xs font-normal text-slate-500">
            Public URL: /legal/{form.slug || "your-custom-slug"}
          </span>
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-800">
          Version
          <Input onChange={(event) => updateForm({ version: event.target.value })} value={form.version} />
        </label>
        <label className="grid gap-2 text-sm font-medium text-slate-800">
          Effective date
          <Input
            onChange={(event) => updateForm({ effective_date: event.target.value || null })}
            type="date"
            value={form.effective_date ?? ""}
          />
        </label>
        <label className="flex items-center gap-3 text-sm font-semibold text-slate-800 md:col-span-2">
          <input
            checked={form.is_active}
            className="h-4 w-4 accent-teal-700"
            onChange={(event) => updateForm({ is_active: event.target.checked })}
            type="checkbox"
          />
          Publish this legal document
        </label>
      </div>

      <LegalMarkdownEditor
        documentId={documentId}
        disabled={saving}
        onChange={(content) => updateForm({ content })}
        value={form.content}
      />

      {message ? <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</p> : null}

      <div className="flex justify-end gap-3">
        <Link
          className="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          href="/admin/legal-documents"
        >
          Cancel
        </Link>
        <Button disabled={saving} onClick={saveDocument} type="button">
          {saving ? "Saving..." : documentId ? "Save changes" : "Create legal document"}
        </Button>
      </div>
    </div>
  );
}