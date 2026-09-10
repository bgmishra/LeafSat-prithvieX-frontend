"use client";

import type { ChangeEvent } from "react";
import { useRef, useState } from "react";
import { Bold, Code2, Eye, EyeOff, Heading2, ImageUp, Italic, LinkIcon, List, ListOrdered, Table2, Video } from "lucide-react";

import { useApiClient } from "@/admin/hooks/useApiClient";
import { MarkdownRenderer } from "@/components/service-pages/MarkdownRenderer";

type DatasetMarkdownEditorProps = {
  datasetId?: number;
  disabled?: boolean;
  onChange: (value: string) => void;
  value: string;
};

const snippets = [
  { icon: Heading2, label: "Heading", value: "\n## Section heading\n" },
  { icon: Bold, label: "Bold", value: "**bold text**" },
  { icon: Italic, label: "Italic", value: "_italic text_" },
  { icon: List, label: "Bullet list", value: "\n- First item\n- Second item\n" },
  { icon: ListOrdered, label: "Numbered list", value: "\n1. First item\n2. Second item\n" },
  { icon: LinkIcon, label: "Link", value: "[link text](https://example.com)" },
  { icon: Code2, label: "Code block", value: "\n```text\ncode or command\n```\n" },
  { icon: Table2, label: "Table", value: "\n| Heading | Value |\n| --- | --- |\n| Item | Value |\n" },
  { icon: Video, label: "YouTube video", value: "\n::youtube https://youtu.be/VIDEO_ID\n" },
];

export function DatasetMarkdownEditor({ datasetId, disabled, onChange, value }: DatasetMarkdownEditorProps) {
  const { request } = useApiClient();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [altText, setAltText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [showPreview, setShowPreview] = useState(true);

  function insert(snippet: string) {
    const textarea = textareaRef.current;
    if (!textarea) return onChange(`${value}${snippet}`);
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    onChange(`${value.slice(0, start)}${snippet}${value.slice(end)}`);
    requestAnimationFrame(() => textarea.focus());
  }

  async function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const image = event.target.files?.[0];
    event.target.value = "";
    if (!image || !datasetId) return;

    setUploading(true);
    setError("");
    try {
      const body = new FormData();
      body.append("image", image);
      body.append("alt_text", altText);
      const result = await request<{ markdown: string }>(
        `/api/v1/admin/datasets/${datasetId}/upload-image/`,
        { body, method: "POST" },
      );
      insert(`\n${result.markdown}\n`);
      setAltText("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to upload image.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap gap-2">
          {snippets.map(({ icon: Icon, label, value: snippet }) => (
            <button className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-60" disabled={disabled} key={label} onClick={() => insert(snippet)} title={label} type="button">
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="grid flex-1 gap-1 text-sm font-medium text-slate-700">Image alt text
            <input className="min-h-10 rounded-md border border-slate-300 px-3 text-sm text-black" disabled={disabled || !datasetId || uploading} onChange={(event) => setAltText(event.target.value)} placeholder="Flood extent map, satellite comparison..." value={altText} />
          </label>
          <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60" disabled={disabled || !datasetId || uploading} onClick={() => imageInputRef.current?.click()} type="button">
            <ImageUp className="h-4 w-4" />{uploading ? "Uploading..." : "Upload image"}
          </button>
          <input accept="image/jpeg,image/png,image/webp" className="hidden" onChange={uploadImage} ref={imageInputRef} type="file" />
        </div>
        {!datasetId ? <p className="mt-2 text-xs text-slate-500">Save the dataset first to enable image uploads.</p> : null}
      </div>
      {error ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      <div className="flex justify-end">
        <button aria-pressed={showPreview} className="inline-flex min-h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50" onClick={() => setShowPreview((current) => !current)} type="button">
          {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}{showPreview ? "Hide preview" : "Show preview"}
        </button>
      </div>
      <div className={`grid gap-4 ${showPreview ? "xl:grid-cols-2" : "grid-cols-1"}`}>
        <label className="grid gap-2 text-sm font-medium text-slate-700"><span>Markdown content</span>
          <textarea className="min-h-[34rem] rounded-lg border border-slate-300 bg-white px-4 py-3 font-mono text-sm leading-6 text-black" disabled={disabled} onChange={(event) => onChange(event.target.value)} ref={textareaRef} value={value} />
        </label>
        {showPreview ? <section className="rounded-lg border border-slate-200 bg-slate-50 p-4"><p className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700"><Eye className="h-4 w-4 text-teal-700" />Live preview</p><article className="min-h-[31rem] rounded-lg border border-slate-200 bg-white p-5 text-slate-800">{value.trim() ? <MarkdownRenderer content={value} /> : <p className="text-sm text-slate-500">Start writing Markdown to see the preview.</p>}</article></section> : null}
      </div>
    </div>
  );
}