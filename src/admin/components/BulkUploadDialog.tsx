"use client";

import { useState } from "react";
import type { ResourceConfig } from "@/admin/types/resources";
import { AdminApiError, useApiClient } from "@/admin/hooks/useApiClient";
import { useToast } from "./ToastProvider";

type BulkUploadResult = {
  created_count?: number;
  skipped_count?: number;
  errors?: Array<{ row: number; detail: string }>;
};

export function BulkUploadDialog({
  config,
  onClose,
  onUploaded,
  open,
}: {
  config: ResourceConfig;
  onClose: () => void;
  onUploaded: () => void;
  open: boolean;
}) {
  const { request } = useApiClient();
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  if (!open || !config.bulkUpload) {
    return null;
  }

  const bulkUpload = config.bulkUpload;

  function handleClose() {
    setFile(null);
    setError("");
    onClose();
  }

  async function submit() {
    if (!file) {
      setError("Choose a file to upload.");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append(bulkUpload.fieldName || "file", file);

      const result = await request<BulkUploadResult>(bulkUpload.endpoint, {
        body: formData,
        method: "POST",
      });

      const createdCount = result?.created_count ?? 0;
      const skippedCount = result?.skipped_count ?? 0;
      const title =
        skippedCount > 0
          ? `${createdCount} record(s) created, ${skippedCount} row(s) skipped. See details below.`
          : `${createdCount} record(s) created.`;

      toast.notify({ title, type: skippedCount > 0 && createdCount === 0 ? "error" : "success" });

      if (skippedCount > 0 && result?.errors?.length) {
        setError(result.errors.map((entry) => `Row ${entry.row}: ${entry.detail}`).join("\n"));
      } else {
        setFile(null);
      }

      onUploaded();

      if (!skippedCount) {
        handleClose();
      }
    } catch (caught) {
      const message = caught instanceof AdminApiError ? caught.message : String(caught);
      setError(message);
      toast.notify({ title: message, type: "error" });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-slate-950/50">
      <div className="h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">{bulkUpload.label || `Bulk Upload ${config.title}`}</h2>
            <p className="mt-1 text-sm text-slate-500">Upload one file to create multiple records at once.</p>
          </div>
          <button className="rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100" onClick={handleClose} type="button">
            Close
          </button>
        </div>

        {bulkUpload.instructions && bulkUpload.instructions.length > 0 ? (
          <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <p className="font-semibold text-slate-800">Expected fields</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {bulkUpload.instructions.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {error ? (
          <div className="mt-5 whitespace-pre-line rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-6 space-y-5">
          <label className="block">
            <span className="text-sm font-medium text-slate-800">File</span>
            <input
              accept={bulkUpload.accept}
              className="mt-2 block w-full text-sm text-slate-700 file:mr-3 file:min-h-11 file:cursor-pointer file:rounded-md file:border-0 file:bg-teal-700 file:px-4 file:text-sm file:font-semibold file:text-white file:transition hover:file:bg-teal-800 disabled:opacity-60"
              disabled={uploading}
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              type="file"
            />
            {file ? <p className="mt-1 text-xs text-slate-600">Selected: {file.name}</p> : null}
          </label>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
            <button
              className="min-h-10 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              disabled={uploading}
              onClick={handleClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="min-h-10 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
              disabled={uploading}
              onClick={submit}
              type="button"
            >
              {uploading ? "Uploading..." : "Upload"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
