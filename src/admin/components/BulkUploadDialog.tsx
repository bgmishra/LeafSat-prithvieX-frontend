"use client";

import { useState } from "react";
import type { ResourceConfig, SelectOption } from "@/admin/types/resources";
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
  options = {},
}: {
  config: ResourceConfig;
  onClose: () => void;
  onUploaded: () => void;
  open: boolean;
  options?: Record<string, SelectOption[]>;
}) {
  const { request } = useApiClient();
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  // Values that apply to the whole file rather than to one row, e.g. the client
  // company every uploaded train section belongs to.
  const [extraValues, setExtraValues] = useState<Record<string, string>>({});

  if (!open || !config.bulkUpload) {
    return null;
  }

  const bulkUpload = config.bulkUpload;
  const extraFields = (bulkUpload.extraFields || [])
    .map((name) => config.fields.find((field) => field.name === name))
    .filter((field) => field !== undefined);

  function handleClose() {
    setFile(null);
    setExtraValues({});
    setError("");
    onClose();
  }

  async function submit() {
    if (!file) {
      setError("Choose a file to upload.");
      return;
    }

    const missingField = extraFields.find(
      (field) => field.required && !extraValues[field.name],
    );
    if (missingField) {
      setError(`Choose a ${missingField.label.toLowerCase()}.`);
      return;
    }

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append(bulkUpload.fieldName || "file", file);

      for (const field of extraFields) {
        const value = extraValues[field.name];
        if (value) {
          formData.append(field.name, value);
        }
      }

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
          {extraFields.map((field) => (
            <label className="block" key={field.name}>
              <span className="text-sm font-medium text-slate-800">{field.label}</span>
              <select
                className="mt-2 block min-h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 disabled:opacity-60"
                disabled={uploading}
                onChange={(event) =>
                  setExtraValues((current) => ({ ...current, [field.name]: event.target.value }))
                }
                value={extraValues[field.name] || ""}
              >
                <option value="">Select {field.label.toLowerCase()}</option>
                {(options[field.name] || []).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {field.helpText ? (
                <p className="mt-1 text-xs text-slate-600">{field.helpText}</p>
              ) : null}
            </label>
          ))}

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
