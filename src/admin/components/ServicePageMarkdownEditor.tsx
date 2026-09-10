"use client";

import type { ChangeEvent } from "react";
import { useRef, useState } from "react";
import {
  Bold,
  Code2,
  Eye,
  Heading2,
  ImageUp,
  Italic,
  LinkIcon,
  List,
  ListOrdered,
  Table2,
  Video,
} from "lucide-react";
import { MarkdownRenderer } from "@/components/service-pages/MarkdownRenderer";
import type { ServicePageUploadResponse } from "@/lib/service-pages";

type ServicePageMarkdownEditorProps = {
  disabled?: boolean;
  onChange: (value: string) => void;
  onUpload: (file: File, altText: string) => Promise<ServicePageUploadResponse>;
  value: string;
};

const snippets = [
  { icon: Heading2, label: "Heading", value: "\n## Section heading\n" },
  { icon: Bold, label: "Bold", value: "**bold text**" },
  { icon: Italic, label: "Italic", value: "_italic text_" },
  { icon: List, label: "Bullet list", value: "\n- First item\n- Second item\n" },
  { icon: ListOrdered, label: "Numbered list", value: "\n1. First step\n2. Second step\n" },
  { icon: LinkIcon, label: "Link", value: "[link text](https://example.com)" },
  { icon: Code2, label: "Code block", value: "\n```text\ncode or command\n```\n" },
  {
    icon: Table2,
    label: "Table",
    value: "\n| Metric | Value |\n| --- | --- |\n| Area | 125 ha |\n",
  },
  {
    icon: Video,
    label: "YouTube video",
    value: "\n::youtube https://youtu.be/VIDEO_ID\n",
  },
];

export function ServicePageMarkdownEditor({
  disabled,
  onChange,
  onUpload,
  value,
}: ServicePageMarkdownEditorProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [altText, setAltText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  function insertSnippet(snippet: string) {
    const textarea = textareaRef.current;

    if (!textarea) {
      const prefix = value.trim() ? `${value.trimEnd()}\n\n` : "";
      onChange(`${prefix}${snippet}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nextValue = `${value.slice(0, start)}${snippet}${value.slice(end)}`;
    onChange(nextValue);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + snippet.length, start + snippet.length);
    });
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setUploading(true);
    setError("");

    try {
      const uploaded = await onUpload(file, altText);
      insertSnippet(`\n${uploaded.markdown}\n`);
      setAltText("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to upload image.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap gap-2">
          {snippets.map((item) => {
            const Icon = item.icon;

            return (
              <button
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                disabled={disabled}
                key={item.label}
                onClick={() => insertSnippet(item.value)}
                title={item.label}
                type="button"
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="grid flex-1 gap-1 text-sm font-medium text-slate-700">
            Image alt text
            <input
              className="min-h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              disabled={disabled || uploading}
              onChange={(event) => setAltText(event.target.value)}
              placeholder="Flood extent map, satellite comparison..."
              value={altText}
            />
          </label>
          <button
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            disabled={disabled || uploading}
            onClick={() => fileInputRef.current?.click()}
            type="button"
          >
            <ImageUp className="h-4 w-4" />
            {uploading ? "Uploading..." : "Upload image"}
          </button>
          <input
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
            ref={fileInputRef}
            type="file"
          />
        </div>
      </div>

      {error ? <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-slate-700">
          Markdown content
          <textarea
            className="min-h-[34rem] rounded-lg border border-slate-300 bg-white px-4 py-3 font-mono text-sm leading-6 text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            disabled={disabled}
            onChange={(event) => onChange(event.target.value)}
            ref={textareaRef}
            spellCheck={false}
            value={value}
          />
        </label>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Eye className="h-4 w-4 text-teal-700" />
            Live preview
          </div>
          <div className="min-h-[31rem] rounded-lg border border-slate-200 bg-white p-5">
            {value.trim() ? (
              <MarkdownRenderer content={value} />
            ) : (
              <p className="text-sm text-slate-500">Start writing Markdown to see the preview.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
