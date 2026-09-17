"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { getErrorMessage } from "@/api/client";
import { GeometryInput } from "@/admin/components/GeometryInput";
import type { ResourceField } from "@/admin/types/resources";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ErrorMessage,
  Panel,
  SuccessMessage,
  TextField,
} from "@/components/ui";
import { ReviewDialog, type ReviewAction } from "./ReviewDialog";
import { SectionDetailDialog } from "./SectionDetailDialog";
import {
  SECTION_STATUS_LABELS,
  SENDABLE_STATUSES,
  approveSections,
  bulkUploadSections,
  createSection,
  deleteSection,
  listSections,
  rejectSections,
  submitSections,
  type RailwaySection,
  type SectionStatus,
} from "@/lib/sections";

const BOUNDARY_FIELD: ResourceField = {
  accept: ".gpkg",
  geojsonFieldName: "boundary_geojson",
  helpText:
    "Upload a GeoPackage (.gpkg) with the section boundary, or draw it directly on the map.",
  label: "Boundary",
  name: "boundary_file",
  required: true,
  type: "geometry",
};

const ATTRIBUTE_FIELDS = [
  { label: "Railway ID", name: "railway_id" },
  { label: "Railway name", name: "railway_name" },
  { label: "Starting point", name: "starting_point_name" },
  { label: "End point", name: "end_point_name" },
  { label: "Section start", name: "section_start_name" },
  { label: "Section end", name: "section_end_name" },
] as const;

const STATUS_FILTERS: Array<{ label: string; value: SectionStatus | "" }> = [
  { label: "All", value: "" },
  { label: "Draft", value: "draft" },
  { label: "Pending approval", value: "pending_approval" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

function statusClasses(status: SectionStatus) {
  if (status === "approved") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }
  if (status === "rejected") {
    return "bg-red-50 text-red-700 ring-red-200";
  }
  if (status === "pending_approval") {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

export function ManageSectionsWorkspace({ canApprove }: { canApprove: boolean }) {
  const [sections, setSections] = useState<RailwaySection[]>([]);
  const [statusFilter, setStatusFilter] = useState<SectionStatus | "">("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  // Held by id, not by object, so the open dialog follows the list through a refresh.
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [review, setReview] = useState<{
    action: ReviewAction;
    sections: RailwaySection[];
  } | null>(null);

  const form = useForm<Record<string, unknown>>({ defaultValues: {} });

  const refresh = useCallback(async () => {
    try {
      setSections(await listSections(statusFilter));
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    // Deferred so the first render settles before refresh() touches state.
    queueMicrotask(() => {
      void refresh();
    });
  }, [refresh]);

  const selected = useMemo(
    () => sections.filter((section) => selectedIds.includes(section.id)),
    [sections, selectedIds],
  );
  const sendable = selected.filter((section) => SENDABLE_STATUSES.includes(section.status));
  const reviewable = selected.filter((section) => section.status === "pending_approval");
  const viewing = sections.find((section) => section.id === viewingId) ?? null;

  function toggleSelection(id: number) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }

  function toggleAll() {
    setSelectedIds((current) =>
      current.length === sections.length ? [] : sections.map((section) => section.id),
    );
  }

  async function run(work: () => Promise<{ message: string }>) {
    setError("");
    setSuccess("");
    setBusy(true);

    try {
      const result = await work();
      setSuccess(result.message);
      setSelectedIds([]);
      await refresh();
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function handleCreate(values: Record<string, unknown>) {
    const file = values.boundary_file instanceof File ? values.boundary_file : undefined;
    const geojson = values.boundary_geojson;

    if (!file && !geojson) {
      setError("Upload a GeoPackage file or draw the section boundary on the map.");
      return;
    }

    await run(async () => {
      await createSection(
        Object.fromEntries(
          ATTRIBUTE_FIELDS.map((field) => [field.name, String(values[field.name] || "")]),
        ),
        { file, geojson },
      );
      form.reset({});
      setCreating(false);
      return { message: "Section drafted. Send it for approval when it is ready." };
    });
  }

  async function handleBulkUpload() {
    if (!bulkFile) {
      setError("Choose a GeoPackage (.gpkg) file to upload.");
      return;
    }

    await run(async () => {
      const result = await bulkUploadSections(bulkFile);
      setBulkFile(null);

      const skipped = result.skipped_count
        ? ` ${result.skipped_count} row(s) skipped.`
        : "";
      return {
        message: `${result.created_count} section(s) drafted.${skipped}`,
      };
    });
  }

  async function handleReview(note: string) {
    if (!review) {
      return;
    }

    const { action, sections: targets } = review;
    const ids = targets.map((section) => section.id);
    setReview(null);
    setViewingId(null);

    await run(() =>
      action === "approve" ? approveSections(ids, note) : rejectSections(ids, note),
    );
  }

  async function handleDelete(section: RailwaySection) {
    if (!window.confirm(`Delete section ${section.railway_id || section.id}?`)) {
      return;
    }

    await run(async () => {
      await deleteSection(section.id);
      return { message: "Section deleted." };
    });
  }

  return (
    <div className="grid gap-6">
      <Panel>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Train sections</h2>
            <p className="mt-1 text-sm text-slate-600">
              Draft a section, then send it to your client super admin for approval. Only approved
              sections reach your field supervisors.
            </p>
          </div>
          <Button onClick={() => setCreating((current) => !current)} variant="outline">
            {creating ? "Cancel" : "New section"}
          </Button>
        </div>

        <div className="mt-4 grid gap-3">
          <ErrorMessage message={error} />
          <SuccessMessage message={success} />
        </div>

        {creating ? (
          <form className="mt-5 grid gap-4" onSubmit={form.handleSubmit(handleCreate)}>
            <div className="grid gap-4 sm:grid-cols-2">
              {ATTRIBUTE_FIELDS.map((field) => (
                <TextField
                  key={field.name}
                  label={field.label}
                  name={field.name}
                  onChange={(event) => form.setValue(field.name, event.target.value)}
                />
              ))}
            </div>
            <GeometryInput
              backendErrors={{}}
              disabled={busy}
              field={BOUNDARY_FIELD}
              form={form}
            />
            <div>
              <Button disabled={busy} type="submit">
                {busy ? "Working..." : "Save as draft"}
              </Button>
            </div>
          </form>
        ) : null}
      </Panel>

      <Panel>
        <h2 className="text-lg font-semibold text-slate-950">Bulk upload</h2>
        <p className="mt-1 text-sm text-slate-600">
          Upload one GeoPackage (.gpkg) containing many sections — one Polygon or MultiPolygon
          feature per section. Every section arrives as a draft.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            accept=".gpkg"
            className="block w-full text-sm text-slate-700 file:mr-3 file:min-h-11 file:cursor-pointer file:rounded-md file:border-0 file:bg-teal-700 file:px-4 file:text-sm file:font-semibold file:text-white hover:file:bg-teal-800"
            disabled={busy}
            onChange={(event) => setBulkFile(event.target.files?.[0] ?? null)}
            type="file"
          />
          <Button disabled={busy || !bulkFile} onClick={handleBulkUpload}>
            Upload
          </Button>
        </div>
      </Panel>

      <Panel>
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map((filter) => (
            <button
              className={`min-h-9 rounded-md px-3 text-sm font-semibold transition ${
                statusFilter === filter.value
                  ? "bg-teal-50 text-teal-800"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
              key={filter.value || "all"}
              onClick={() => {
                setSelectedIds([]);
                setStatusFilter(filter.value);
              }}
              type="button"
            >
              {filter.label}
            </button>
          ))}
        </div>

        {selectedIds.length > 0 ? (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
            <span className="text-sm text-slate-600">{selectedIds.length} selected</span>
            <Button
              disabled={busy || sendable.length === 0}
              onClick={() => run(() => submitSections(sendable.map((section) => section.id)))}
              size="sm"
            >
              Send for approval ({sendable.length})
            </Button>
            {canApprove ? (
              <>
                <Button
                  disabled={busy || reviewable.length === 0}
                  onClick={() => setReview({ action: "approve", sections: reviewable })}
                  size="sm"
                  variant="outline"
                >
                  Approve ({reviewable.length})
                </Button>
                <Button
                  disabled={busy || reviewable.length === 0}
                  onClick={() => setReview({ action: "reject", sections: reviewable })}
                  size="sm"
                  variant="outline"
                >
                  Send back ({reviewable.length})
                </Button>
              </>
            ) : null}
          </div>
        ) : null}

        {loading ? (
          <p className="py-8 text-center text-sm text-slate-500">Loading sections...</p>
        ) : sections.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            No sections yet. Create one above, or bulk upload a GeoPackage.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="p-3">
                    <input
                      aria-label="Select all sections"
                      checked={selectedIds.length === sections.length}
                      onChange={toggleAll}
                      type="checkbox"
                    />
                  </th>
                  <th className="p-3">Railway ID</th>
                  <th className="p-3">Railway name</th>
                  <th className="p-3">Section</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Created by</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sections.map((section) => (
                  <tr key={section.id}>
                    <td className="p-3">
                      <input
                        aria-label={`Select section ${section.railway_id || section.id}`}
                        checked={selectedIds.includes(section.id)}
                        onChange={() => toggleSelection(section.id)}
                        type="checkbox"
                      />
                    </td>
                    <td className="p-3 font-medium text-slate-950">{section.railway_id || "-"}</td>
                    <td className="p-3 text-slate-600">{section.railway_name || "-"}</td>
                    <td className="p-3 text-slate-600">
                      {section.section_start_name || "-"} to {section.section_end_name || "-"}
                    </td>
                    <td className="p-3">
                      <Badge className={statusClasses(section.status)}>
                        {SECTION_STATUS_LABELS[section.status]}
                      </Badge>
                      {section.reviewed_by_name ? (
                        <p className="mt-1 max-w-xs text-xs text-slate-500">
                          {section.status === "rejected" ? "Sent back" : "Approved"} by{" "}
                          {section.reviewed_by_name}
                          {section.reviewed_at
                            ? ` on ${new Date(section.reviewed_at).toLocaleDateString()}`
                            : ""}
                        </p>
                      ) : null}
                      {section.review_note ? (
                        <p
                          className={`mt-1 max-w-xs text-xs ${
                            section.status === "rejected" ? "text-red-600" : "text-slate-600"
                          }`}
                        >
                          &ldquo;{section.review_note}&rdquo;
                        </p>
                      ) : null}
                    </td>
                    <td className="p-3 text-slate-600">{section.created_by_name || "-"}</td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          onClick={() => setViewingId(section.id)}
                          size="sm"
                          variant="outline"
                        >
                          View
                        </Button>
                        {section.is_editable ? (
                          <Button
                            disabled={busy}
                            onClick={() => handleDelete(section)}
                            size="sm"
                            variant="outline"
                          >
                            Delete
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <SectionDetailDialog
        busy={busy}
        canApprove={canApprove}
        onApprove={(section) => setReview({ action: "approve", sections: [section] })}
        onClose={() => setViewingId(null)}
        onReject={(section) => setReview({ action: "reject", sections: [section] })}
        section={viewing}
      />

      <ReviewDialog
        action={review?.action ?? "approve"}
        count={review?.sections.length ?? 0}
        loading={busy}
        onClose={() => setReview(null)}
        onConfirm={handleReview}
        open={review !== null}
      />
    </div>
  );
}
