"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
import { RejectedSectionEditor, type RejectedEditPayload } from "./RejectedSectionEditor";
import { ReviewDialog, type ReviewAction } from "./ReviewDialog";
import {
  SECTION_ATTRIBUTE_FIELDS,
  SECTION_STATUS_LABELS,
  SENDABLE_STATUSES,
  approveSections,
  createSection,
  deleteSection,
  listSections,
  rejectSections,
  submitSections,
  updateSection,
  type RailwaySection,
  type SectionStatus,
} from "@/lib/sections";

function boundaryField(editing: boolean): ResourceField {
  return {
    accept: ".gpkg",
    geojsonFieldName: "boundary_geojson",
    helpText: editing
      ? "Leave this alone to keep the current boundary, or upload/draw a new one to replace it."
      : "Upload a GeoPackage (.gpkg) holding exactly one section boundary, or draw it directly on the map.",
    label: "Boundary",
    name: "boundary_file",
    required: !editing,
    type: "geometry",
  };
}

/**
 * The list tabs. Rejected sections are private to whoever wrote them, so this
 * tab is the author's own to-fix pile rather than a company-wide view.
 */
const STATUS_TABS: Array<{ label: string; value: SectionStatus | "" }> = [
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

function Tab({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      aria-selected={active}
      className={`-mb-px flex min-h-10 shrink-0 items-center border-b-2 px-4 text-sm font-semibold transition ${
        active
          ? "border-teal-700 text-teal-800"
          : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900"
      }`}
      onClick={onClick}
      role="tab"
      type="button"
    >
      {children}
    </button>
  );
}

export function ManageSectionsWorkspace({
  canApprove,
  canDelete,
  currentUserEmail,
}: {
  canApprove: boolean;
  canDelete: boolean;
  currentUserEmail: string | null;
}) {
  const [sections, setSections] = useState<RailwaySection[]>([]);
  const [statusFilter, setStatusFilter] = useState<SectionStatus | "">("");
  // One section at a time: every workflow action here applies to a single
  // record, so the list offers a single choice rather than a set.
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [composing, setComposing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [review, setReview] = useState<{
    action: ReviewAction;
    sections: RailwaySection[];
  } | null>(null);

  const form = useForm<Record<string, unknown>>({ defaultValues: {} });

  /**
   * Every section the caller may see, fetched unfiltered and split by status
   * here. Holding the whole set client-side is what lets the tabs carry counts,
   * and means a freshly drafted section is on screen whichever tab is open
   * rather than only when the Draft filter happens to be selected.
   */
  const refresh = useCallback(async () => {
    try {
      setSections(await listSections());
      setError("");
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Deferred so the first render settles before refresh() touches state.
    queueMicrotask(() => {
      void refresh();
    });
  }, [refresh]);

  const counts = useMemo(() => {
    const tally: Record<string, number> = { "": sections.length };
    for (const section of sections) {
      tally[section.status] = (tally[section.status] ?? 0) + 1;
    }
    return tally;
  }, [sections]);

  const visible = useMemo(
    () => (statusFilter ? sections.filter((s) => s.status === statusFilter) : sections),
    [sections, statusFilter],
  );

  // Resolved against the list rather than stored, so the selection survives a
  // refresh and quietly drops itself if the section leaves the caller's view.
  const selected = useMemo(
    () => sections.find((section) => section.id === selectedId) ?? null,
    [sections, selectedId],
  );
  const canSend = selected !== null && SENDABLE_STATUSES.includes(selected.status);
  const canReview = selected !== null && selected.status === "pending_approval";
  const editing = sections.find((section) => section.id === editingId) ?? null;
  // A rejected section gets its own editor: the boundary already exists, is
  // usually nearly right, and the reviewer's reason has to stay in view.
  const fixing = editing?.status === "rejected" ? editing : null;

  /**
   * A section can be revised by the person who wrote it, right up until it is
   * signed off — the same window in which it can be sent for approval. Everyone
   * else sends it back with a remark instead of rewriting it underneath them.
   */
  function canEdit(section: RailwaySection) {
    return (
      SENDABLE_STATUSES.includes(section.status) &&
      Boolean(currentUserEmail) &&
      section.created_by_email === currentUserEmail
    );
  }

  function startEditing(section: RailwaySection) {
    form.reset(
      Object.fromEntries(
        SECTION_ATTRIBUTE_FIELDS.map((field) => [field.name, section[field.name] ?? ""]),
      ),
    );
    setEditingId(section.id);
    setComposing(true);
    setError("");
    setSuccess("");
  }

  function stopComposing() {
    form.reset({});
    setEditingId(null);
    setComposing(false);
  }

  async function run(work: () => Promise<{ message: string }>) {
    setError("");
    setSuccess("");
    setBusy(true);

    try {
      const result = await work();
      setSuccess(result.message);
      setSelectedId(null);
      await refresh();
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  function attributesFrom(values: Record<string, unknown>) {
    return Object.fromEntries(
      SECTION_ATTRIBUTE_FIELDS.map((field) => [field.name, String(values[field.name] || "")]),
    );
  }

  async function handleSave(values: Record<string, unknown>) {
    const file = values.boundary_file instanceof File ? values.boundary_file : undefined;
    const geojson = values.boundary_geojson;
    const target = editing;

    if (!target && !file && !geojson) {
      setError("Upload a GeoPackage file or draw the section boundary on the map.");
      return;
    }

    await run(async () => {
      if (target) {
        await updateSection(target.id, attributesFrom(values), { file, geojson });
        stopComposing();
        return { message: "Section updated." };
      }

      await createSection(attributesFrom(values), { file, geojson });
      stopComposing();
      // Land on the tab the new section is actually in, so it is on screen
      // rather than filtered out by whichever tab happened to be open.
      setStatusFilter("draft");
      return { message: "Section drafted. Send it for approval when it is ready." };
    });
  }

  async function handleFixRejected(payload: RejectedEditPayload) {
    if (!fixing) {
      return;
    }

    const target = fixing;

    await run(async () => {
      await updateSection(target.id, payload.attributes, payload.boundary);
      stopComposing();

      if (!payload.resubmit) {
        return { message: "Section updated. Send it for approval when it is ready." };
      }

      // Resubmitting only makes sense if the edit saved, so it is a second call
      // rather than a flag: a rejected boundary that still fails validation
      // leaves the section where it was instead of going up broken.
      await submitSections([target.id]);
      setStatusFilter("pending_approval");
      return { message: "Section updated and sent for approval." };
    });
  }

  async function handleReview(note: string) {
    if (!review) {
      return;
    }

    const { action, sections: targets } = review;
    const ids = targets.map((section) => section.id);
    setReview(null);

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
            <h2 className="text-lg font-semibold text-slate-950">
              {fixing
                ? `Fix ${fixing.railway_id || `section ${fixing.id}`}`
                : "Add sections"}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {fixing
                ? "Correct what the reviewer flagged, then send it back up for approval."
                : "Draft a section, then send it to your client super admin for approval. Only approved sections reach your field supervisors. To load many at once, use Bulk upload."}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            {fixing ? null : (
              <Button asChild variant="outline">
                <Link href="/manage-sections/bulk">Bulk upload</Link>
              </Button>
            )}
            <Button
              onClick={() => (composing ? stopComposing() : setComposing(true))}
              variant="outline"
            >
              {composing ? "Cancel" : "New section"}
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          <ErrorMessage message={error} />
          <SuccessMessage message={success} />
        </div>

        {composing && fixing ? (
          <RejectedSectionEditor
            busy={busy}
            // Re-keyed per record so the map rebuilds around the right boundary.
            key={`fix-${fixing.id}`}
            onCancel={stopComposing}
            onSubmit={handleFixRejected}
            section={fixing}
          />
        ) : composing ? (
          <>
            {editing ? (
              <p className="mt-5 rounded-md border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
                Editing <strong>{editing.railway_id || `section ${editing.id}`}</strong>. It stays a{" "}
                {SECTION_STATUS_LABELS[editing.status].toLowerCase()} until you send it for
                approval.
              </p>
            ) : null}
            <form className="mt-5 grid gap-4" onSubmit={form.handleSubmit(handleSave)}>
                {/* From lg up the paperwork sits beside the map at 40/60 rather
                    than above it: the fields are quick to fill, the map is the
                    part that needs room, and stacking pushed it below the fold
                    on a desktop screen. Narrower than lg they stack as before. */}
                <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
                  {/* content-start keeps the inputs their natural height instead
                      of stretching them to match the map column. */}
                  <div className="grid content-start gap-4 sm:grid-cols-2 lg:grid-cols-1">
                    {SECTION_ATTRIBUTE_FIELDS.map((field) => (
                      <TextField
                        defaultValue={editing ? (editing[field.name] ?? "") : ""}
                        // Re-keyed per record so switching between editing a section
                        // and drafting a new one re-seeds the inputs.
                        key={`${field.name}-${editing?.id ?? "new"}`}
                        label={field.label}
                        name={field.name}
                        onChange={(event) => form.setValue(field.name, event.target.value)}
                      />
                    ))}
                  </div>
                  <GeometryInput
                    backendErrors={{}}
                    disabled={busy}
                    field={boundaryField(Boolean(editing))}
                    form={form}
                    // Remounted per record: the map holds the drawn shape in its
                    // own vector source, which a form reset does not clear, so
                    // without this the previous polygon lingers on screen.
                    key={`boundary-${editing?.id ?? "new"}`}
                  />
                </div>
                <div className="flex gap-3">
                  <Button disabled={busy} type="submit">
                    {busy ? "Working..." : editing ? "Save changes" : "Save as draft"}
                  </Button>
                  <Button disabled={busy} onClick={stopComposing} type="button" variant="outline">
                    Cancel
                  </Button>
                </div>
              </form>
          </>
        ) : null}
      </Panel>

      <Panel>
        <div className="flex gap-1 overflow-x-auto border-b border-slate-200" role="tablist">
          {STATUS_TABS.map((tab) => (
            <Tab
              active={statusFilter === tab.value}
              key={tab.value || "all"}
              onClick={() => {
                setSelectedId(null);
                setStatusFilter(tab.value);
              }}
            >
              {tab.label}
              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                {counts[tab.value] ?? 0}
              </span>
            </Tab>
          ))}
        </div>

        {selected ? (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
            <span className="text-sm text-slate-600">
              <strong className="font-semibold text-slate-900">
                {selected.railway_id || `Section ${selected.id}`}
              </strong>{" "}
              selected
            </span>
            <Button
              disabled={busy || !canSend}
              onClick={() => run(() => submitSections([selected.id]))}
              size="sm"
            >
              Send for approval
            </Button>
            {canApprove ? (
              <>
                <Button
                  disabled={busy || !canReview}
                  onClick={() => setReview({ action: "approve", sections: [selected] })}
                  size="sm"
                  variant="outline"
                >
                  Approve
                </Button>
                <Button
                  disabled={busy || !canReview}
                  onClick={() => setReview({ action: "reject", sections: [selected] })}
                  size="sm"
                  variant="outline"
                >
                  Reject
                </Button>
              </>
            ) : null}
            <button
              className="ml-auto text-sm font-medium text-slate-500 hover:text-slate-800"
              onClick={() => setSelectedId(null)}
              type="button"
            >
              Clear selection
            </button>
          </div>
        ) : null}

        {loading ? (
          <p className="py-8 text-center text-sm text-slate-500">Loading sections...</p>
        ) : visible.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            {sections.length === 0
              ? "No sections yet. Create one above, or load a batch from Bulk upload."
              : "Nothing in this tab."}
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="p-3">
                    <span className="sr-only">Select</span>
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
                {visible.map((section) => (
                  <tr key={section.id}>
                    <td className="p-3">
                      <input
                        aria-label={`Select section ${section.railway_id || section.id}`}
                        checked={selectedId === section.id}
                        // A shared name makes the rows one radio group, so arrow
                        // keys move the selection the way a radio group should.
                        name="section-selection"
                        onChange={() => setSelectedId(section.id)}
                        type="radio"
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
                          {section.status === "rejected" ? "Rejected" : "Approved"} by{" "}
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
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/manage-sections/${section.id}`}>View</Link>
                        </Button>
                        {canEdit(section) ? (
                          <Button
                            disabled={busy}
                            onClick={() => startEditing(section)}
                            size="sm"
                            variant="outline"
                          >
                            Edit
                          </Button>
                        ) : null}
                        {canDelete ? (
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
