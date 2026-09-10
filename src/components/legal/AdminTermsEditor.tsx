"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { type LegalDocument } from "@/lib/legal-documents";
import { AdminApiError, useApiClient } from "@/admin/hooks/useApiClient";

type EditableTerms = Pick<LegalDocument, "title" | "version" | "effective_date" | "content">;

function documentToForm(document: LegalDocument): EditableTerms {
  return {
    title: document.title,
    version: document.version,
    effective_date: document.effective_date ?? "",
    content: document.content,
  };
}

export function AdminTermsEditor() {
  const { request } = useApiClient();
  const [form, setForm] = useState<EditableTerms | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    async function loadTerms() {
      setIsLoading(true);
      setMessage(null);

      try {
        const document = await request<LegalDocument>("/api/v1/admin/legal/terms/");
        if (isCurrent) {
          setForm(documentToForm(document));
        }
      } catch (error) {
        if (isCurrent) {
          setIsError(true);
          setMessage(error instanceof Error ? error.message : "Unable to load the Terms of Service.");
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    loadTerms();

    return () => {
      isCurrent = false;
    };
  }, [request]);

  function updateField<Key extends keyof EditableTerms>(key: Key, value: EditableTerms[Key]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  async function saveTerms() {
    if (!form) {
      return;
    }

    setIsSaving(true);
    setIsError(false);
    setMessage(null);

    try {
      const document = await request<LegalDocument>("/api/v1/admin/legal/terms/", {
        method: "PATCH",
        body: JSON.stringify({
          ...form,
          effective_date: form.effective_date || null,
        }),
      });
      setForm(documentToForm(document));
      setMessage("Terms of Service saved successfully.");
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof AdminApiError || error instanceof Error
          ? error.message
          : "Unable to save the Terms of Service.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading Terms of Service...</p>;
  }

  if (!form) {
    return <p className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{message}</p>;
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="terms-title">Document title</Label>
            <Input
              id="terms-title"
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="terms-version">Version</Label>
            <Input
              id="terms-version"
              value={form.version}
              onChange={(event) => updateField("version", event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="terms-effective-date">Effective date</Label>
            <Input
              id="terms-effective-date"
              type="date"
              value={form.effective_date ?? ""}
              onChange={(event) => updateField("effective_date", event.target.value)}
            />
          </div>
        </div>

        <div className="mt-5 grid gap-2">
          <Label htmlFor="terms-content">Content (Markdown)</Label>
          <Textarea
            id="terms-content"
            className="min-h-[28rem] font-mono text-sm leading-6"
            value={form.content}
            onChange={(event) => updateField("content", event.target.value)}
          />
        </div>

        {message ? (
          <p className={`mt-4 text-sm ${isError ? "text-red-700" : "text-emerald-700"}`} role="status">
            {message}
          </p>
        ) : null}

        <div className="mt-5 flex justify-end">
          <Button type="button" disabled={isSaving} onClick={saveTerms}>
            {isSaving ? "Saving..." : "Save Terms of Service"}
          </Button>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="border-b border-slate-200 pb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">Preview</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950">{form.title || "Terms of Service"}</h2>
        </div>
        <article className="legal-document legal-document--light mt-5">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
            {form.content}
          </ReactMarkdown>
        </article>
      </section>
    </div>
  );
}