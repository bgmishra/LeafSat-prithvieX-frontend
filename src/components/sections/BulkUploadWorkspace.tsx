"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getErrorMessage } from "@/api/client";
import { useAuthUser } from "@/admin/hooks/useAuthUser";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorMessage, PageHeader, Panel, SuccessMessage } from "@/components/ui";
import { useAuth } from "@/store/auth-provider";
import {
  SECTION_ATTRIBUTE_FIELDS,
  SECTION_STATUS_LABELS,
  SENDABLE_STATUSES,
  bulkUploadSections,
  listBulkUploads,
  listSectionsInUpload,
  submitSections,
  type BulkUpload,
  type RailwaySection,
  type SectionStatus,
} from "@/lib/sections";

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

function Tally({ count, label }: { count: number; label: string }) {
  if (count === 0) {
    return null;
  }

  return (
    <span className="text-xs text-slate-600">
      <strong className="font-semibold text-slate-900">{count}</strong> {label}
    </span>
  );
}

/**
 * Everything to do with uploading many sections at once, kept away from the
 * single-section workflow.
 *
 * The unit of work here is the upload, not the section: fifty sections that
 * arrived in one file get checked over and sent up together, which is why this
 * is the one place with multi-select. The main sections list stays one action at
 * a time.
 */
export function BulkUploadWorkspace() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { isClientSuperAdmin, isEngineer, loading: roleLoading } = useAuthUser({
    enabled: isAuthenticated,
  });
  const canManage = isClientSuperAdmin || isEngineer;

  const [uploads, setUploads] = useState<BulkUpload[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);
  const [sections, setSections] = useState<RailwaySection[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingSections, setLoadingSections] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const refreshUploads = useCallback(async () => {
    try {
      setUploads(await listBulkUploads());
      setError("");
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    queueMicrotask(() => {
      void refreshUploads();
    });
  }, [isAuthenticated, refreshUploads]);

  const openUpload = useCallback(async (uploadId: number) => {
    setOpenId(uploadId);
    setSelectedIds([]);
    setLoadingSections(true);

    try {
      setSections(await listSectionsInUpload(uploadId));
      setError("");
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoadingSections(false);
    }
  }, []);

  useEffect(() => {
    if (!roleLoading && !canManage) {
      router.replace("/");
    }
  }, [canManage, roleLoading, router]);

  async function run(work: () => Promise<{ message: string }>) {
    setError("");
    setSuccess("");
    setBusy(true);

    try {
      const result = await work();
      setSuccess(result.message);
      await refreshUploads();
      if (openId) {
        await openUpload(openId);
      }
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function handleUpload() {
    if (!file) {
      setError("Choose a GeoPackage (.gpkg) file to upload.");
      return;
    }

    await run(async () => {
      const result = await bulkUploadSections(file);
      setFile(null);
      await openUpload(result.bulk_upload.id);

      const skipped = result.skipped_count
        ? ` ${result.skipped_count} row(s) skipped — ${result.errors
            .slice(0, 3)
            .map((row) => `row ${row.row}: ${row.detail}`)
            .join("; ")}`
        : "";

      return { message: `${result.created_count} section(s) drafted.${skipped}` };
    });
  }

  const sendable = sections.filter(
    (section) => selectedIds.includes(section.id) && SENDABLE_STATUSES.includes(section.status),
  );
  const selectableIds = sections
    .filter((section) => SENDABLE_STATUSES.includes(section.status))
    .map((section) => section.id);
  const openUploadRow = uploads.find((upload) => upload.id === openId) ?? null;

  function toggle(id: number) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }

  function toggleAll() {
    // "All" means everything that could actually be sent, not every row — an
    // already-approved section is not a thing you can select your way into.
    setSelectedIds((current) =>
      current.length === selectableIds.length ? [] : selectableIds,
    );
  }

  if (roleLoading) {
    return (
      <div className="grid gap-6 p-4 sm:p-6">
        <p className="py-12 text-center text-sm text-slate-500">Checking your access...</p>
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="grid gap-6 p-4 sm:p-6">
        <p className="py-12 text-center text-sm text-slate-500">
          Only a client super admin or an engineer can upload train sections.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 p-4 sm:p-6">
      <Link
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
        href="/manage-sections"
      >
        <ArrowLeft className="size-4" />
        All sections
      </Link>

      <PageHeader
        description="Upload a GeoPackage holding many sections at once. Each upload is kept together, so you can check the sections it produced and send them for approval as a batch."
        eyebrow="Your company"
        title="Bulk upload"
      />

      <div className="grid gap-3">
        <ErrorMessage message={error} />
        <SuccessMessage message={success} />
      </div>

      <Panel>
        <h2 className="text-lg font-semibold text-slate-950">New upload</h2>
        <p className="mt-1 text-sm text-slate-600">
          One GeoPackage (.gpkg), one Polygon feature per section. Every section arrives as a
          draft.
        </p>

        <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-950">Attribute columns to include</h3>
          <p className="mt-1 text-xs text-slate-600">
            Name your columns exactly as below. Matching ignores case, and any column you leave out
            simply comes in blank.
          </p>
          <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
            {SECTION_ATTRIBUTE_FIELDS.map((field) => (
              <div className="flex flex-col" key={field.name}>
                <dt className="font-mono text-xs font-semibold text-slate-900">{field.name}</dt>
                <dd className="text-xs text-slate-600">{field.hint}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-slate-600">
            Each polygon must be a solid area — no holes, and no outline that crosses itself. Rows
            that fail are reported and skipped; the rest still load.
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            accept=".gpkg"
            className="block w-full text-sm text-slate-700 file:mr-3 file:min-h-11 file:cursor-pointer file:rounded-md file:border-0 file:bg-teal-700 file:px-4 file:text-sm file:font-semibold file:text-white hover:file:bg-teal-800"
            disabled={busy}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            type="file"
          />
          <Button disabled={busy || !file} onClick={handleUpload}>
            {busy ? "Uploading..." : "Upload"}
          </Button>
        </div>
      </Panel>

      <Panel>
        <h2 className="text-lg font-semibold text-slate-950">Your uploads</h2>

        {loading ? (
          <p className="py-8 text-center text-sm text-slate-500">Loading uploads...</p>
        ) : uploads.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            No uploads yet. Your first GeoPackage will appear here.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {uploads.map((upload) => (
              <li
                className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                key={upload.id}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950">
                    {upload.file_name || `Upload ${upload.id}`}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {new Date(upload.created_at).toLocaleString()}
                    {upload.uploaded_by_name ? ` · ${upload.uploaded_by_name}` : ""}
                    {upload.skipped_count ? ` · ${upload.skipped_count} row(s) skipped` : ""}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-x-3">
                    <Tally count={upload.draft_count} label="draft" />
                    <Tally count={upload.pending_count} label="pending" />
                    <Tally count={upload.approved_count} label="approved" />
                    <Tally count={upload.rejected_count} label="rejected" />
                    {upload.section_count === 0 ? (
                      <span className="text-xs text-slate-500">No sections remain</span>
                    ) : null}
                  </div>
                </div>
                <Button
                  disabled={busy}
                  onClick={() => (openId === upload.id ? setOpenId(null) : void openUpload(upload.id))}
                  size="sm"
                  variant="outline"
                >
                  {openId === upload.id ? "Close" : "Open"}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {openId && openUploadRow ? (
        <Panel>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-slate-950">
              Sections from {openUploadRow.file_name || `upload ${openUploadRow.id}`}
            </h2>
            <Button
              disabled={busy || sendable.length === 0}
              onClick={() =>
                run(async () => {
                  await submitSections(sendable.map((section) => section.id));
                  setSelectedIds([]);
                  return { message: `${sendable.length} section(s) sent for approval.` };
                })
              }
              size="sm"
            >
              Send {sendable.length || ""} for approval
            </Button>
          </div>

          {loadingSections ? (
            <p className="py-8 text-center text-sm text-slate-500">Loading sections...</p>
          ) : sections.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              Nothing from this upload is visible to you any more.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="p-3">
                      <input
                        aria-label="Select every section that can be sent"
                        checked={
                          selectableIds.length > 0 && selectedIds.length === selectableIds.length
                        }
                        disabled={selectableIds.length === 0}
                        onChange={toggleAll}
                        type="checkbox"
                      />
                    </th>
                    <th className="p-3">Railway ID</th>
                    <th className="p-3">Section</th>
                    <th className="p-3">Status</th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sections.map((section) => {
                    const selectable = SENDABLE_STATUSES.includes(section.status);

                    return (
                      <tr key={section.id}>
                        <td className="p-3">
                          <input
                            aria-label={`Select section ${section.railway_id || section.id}`}
                            checked={selectedIds.includes(section.id)}
                            disabled={!selectable}
                            onChange={() => toggle(section.id)}
                            type="checkbox"
                          />
                        </td>
                        <td className="p-3 font-medium text-slate-950">
                          {section.railway_id || "-"}
                        </td>
                        <td className="p-3 text-slate-600">
                          {section.section_start_name || "-"} to {section.section_end_name || "-"}
                        </td>
                        <td className="p-3">
                          <Badge className={statusClasses(section.status)}>
                            {SECTION_STATUS_LABELS[section.status]}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/manage-sections/${section.id}`}>View</Link>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      ) : null}
    </div>
  );
}
