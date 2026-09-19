"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ApiError, getErrorMessage } from "@/api/client";
import { GeoJsonMapPreview } from "@/admin/components/GeoJsonMapPreview";
import { useAuthUser } from "@/admin/hooks/useAuthUser";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorMessage, Panel, SuccessMessage } from "@/components/ui";
import { useAuth } from "@/store/auth-provider";
import {
  RejectedSectionEditor,
  type RejectedEditPayload,
} from "./RejectedSectionEditor";
import { ReviewDialog, type ReviewAction } from "./ReviewDialog";
import {
  SECTION_ATTRIBUTE_FIELDS,
  SECTION_STATUS_LABELS,
  SENDABLE_STATUSES,
  approveSections,
  deleteSection,
  getSection,
  rejectSections,
  submitSections,
  updateSection,
  type RailwaySection,
} from "@/lib/sections";

function text(value: string | null | undefined) {
  return value == null || value === "" ? "-" : value;
}

function timestamp(value: string | null) {
  return value ? new Date(value).toLocaleString() : "-";
}

function statusClasses(section: RailwaySection) {
  if (section.status === "approved") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }
  if (section.status === "rejected") {
    return "bg-red-50 text-red-700 ring-red-200";
  }
  if (section.status === "pending_approval") {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-slate-800">{value}</dd>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-6 p-4 sm:p-6">{children}</div>;
}

/**
 * One section at its own address.
 *
 * Previously this lived in a drawer over the list, which meant the thing people
 * most want to point a colleague at — "look at this boundary" — had no URL. The
 * page carries the review actions the drawer had, and gives the map the full
 * width it never got in a 2xl panel.
 */
export function SectionDetailWorkspace({ sectionId }: { sectionId: string }) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { isClientSuperAdmin, isEngineer, loading: roleLoading, user } = useAuthUser({
    enabled: isAuthenticated,
  });

  const [section, setSection] = useState<RailwaySection | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [review, setReview] = useState<ReviewAction | null>(null);

  const id = Number(sectionId);
  const canManage = isClientSuperAdmin || isEngineer;

  const refresh = useCallback(async () => {
    if (!Number.isInteger(id) || id <= 0) {
      setMissing(true);
      setLoading(false);
      return;
    }

    try {
      setSection(await getSection(id));
      setMissing(false);
    } catch (caught) {
      // The server returns 404 both for "no such section" and for one this user
      // may not see, so the page says the same thing for both.
      if (caught instanceof ApiError && caught.status === 404) {
        setMissing(true);
      } else {
        setError(getErrorMessage(caught));
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    queueMicrotask(() => {
      void refresh();
    });
  }, [isAuthenticated, refresh]);

  async function run(work: () => Promise<{ message: string; gone?: boolean }>) {
    setError("");
    setSuccess("");
    setBusy(true);

    try {
      const result = await work();

      if (result.gone) {
        router.replace("/manage-sections");
        return;
      }

      setSuccess(result.message);
      await refresh();
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function handleReview(note: string) {
    if (!section || !review) {
      return;
    }

    const action = review;
    setReview(null);

    await run(async () => {
      if (action === "approve") {
        await approveSections([section.id], note);
        return { message: "Section approved." };
      }

      await rejectSections([section.id], note);
      // Rejecting hands the section back to its author, so a reviewer who is not
      // the author loses sight of it and there is nothing left to show here.
      return {
        gone: section.created_by_email !== user?.email,
        message: "Section rejected.",
      };
    });
  }

  async function handleEdit(payload: RejectedEditPayload) {
    if (!section) {
      return;
    }

    const target = section;

    await run(async () => {
      await updateSection(target.id, payload.attributes, payload.boundary);
      setEditing(false);

      if (!payload.resubmit) {
        return { message: "Section updated. Send it for approval when it is ready." };
      }

      await submitSections([target.id]);
      return { message: "Section updated and sent for approval." };
    });
  }

  async function handleDelete() {
    if (!section || !window.confirm(`Delete section ${section.railway_id || section.id}?`)) {
      return;
    }

    await run(async () => {
      await deleteSection(section.id);
      return { gone: true, message: "Section deleted." };
    });
  }

  if (loading || roleLoading) {
    return (
      <Shell>
        <p className="py-12 text-center text-sm text-slate-500">Loading section...</p>
      </Shell>
    );
  }

  if (!canManage) {
    return (
      <Shell>
        <Panel>
          <p className="py-8 text-center text-sm text-slate-500">
            Only a client super admin or an engineer can open train sections.
          </p>
        </Panel>
      </Shell>
    );
  }

  if (missing || !section) {
    return (
      <Shell>
        <Panel>
          <div className="py-8 text-center">
            <p className="text-sm text-slate-600">
              That section does not exist, or it is not one you can see. Drafts and rejected
              sections are private to whoever wrote them.
            </p>
            <Link
              className="mt-4 inline-block text-sm font-semibold text-teal-700 hover:text-teal-800"
              href="/manage-sections"
            >
              Back to sections
            </Link>
          </div>
        </Panel>
      </Shell>
    );
  }

  const isAuthor = Boolean(user?.email) && section.created_by_email === user?.email;
  const canEdit = isAuthor && SENDABLE_STATUSES.includes(section.status);
  const awaitingReview = section.status === "pending_approval";

  return (
    <Shell>
      <Link
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
        href="/manage-sections"
      >
        <ArrowLeft className="size-4" />
        All sections
      </Link>

      <Panel>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-950">
              {section.railway_id || `Section ${section.id}`}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {text(section.railway_name)} · {section.organization_name}
            </p>
          </div>
          <Badge className={statusClasses(section)}>
            {SECTION_STATUS_LABELS[section.status]}
          </Badge>
        </div>

        <div className="mt-4 grid gap-3">
          <ErrorMessage message={error} />
          <SuccessMessage message={success} />
        </div>

        {editing ? (
          <div className="mt-5">
            <RejectedSectionEditor
              busy={busy}
              key={`edit-${section.id}`}
              onCancel={() => setEditing(false)}
              onSubmit={handleEdit}
              section={section}
            />
          </div>
        ) : (
          <>
            <div className="mt-5">
              <h2 className="text-sm font-semibold text-slate-950">Boundary</h2>
              <p className="mt-1 text-sm text-slate-500">
                The track section this record covers.
              </p>
              <div className="mt-3">
                <GeoJsonMapPreview
                  className="h-[26rem] max-h-[70vh] w-full overflow-hidden rounded-md border border-slate-200 sm:h-[32rem]"
                  geometry={section.section_polygon}
                />
              </div>
            </div>

            <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
              {SECTION_ATTRIBUTE_FIELDS.map((field) => (
                <Detail key={field.name} label={field.label} value={text(section[field.name])} />
              ))}
            </dl>

            <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 rounded-md border border-slate-200 px-4 py-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <Detail label="Drafted by" value={text(section.created_by_name)} />
              <Detail label="Drafted on" value={timestamp(section.created_at)} />
              <Detail label="Sent for approval" value={timestamp(section.submitted_at)} />
              <Detail label="Reviewed by" value={text(section.reviewed_by_name)} />
            </dl>

            {section.review_note ? (
              <div
                className={`mt-4 rounded-md border px-4 py-3 text-sm ${
                  section.status === "rejected"
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-slate-200 bg-slate-50 text-slate-700"
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-wide">
                  {section.status === "rejected" ? "Rejection reason" : "Approval remark"}
                </p>
                <p className="mt-1">{section.review_note}</p>
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-5">
              {canEdit ? (
                <Button disabled={busy} onClick={() => setEditing(true)} variant="outline">
                  Edit
                </Button>
              ) : null}
              {isAuthor && SENDABLE_STATUSES.includes(section.status) ? (
                <Button
                  disabled={busy}
                  onClick={() => run(async () => {
                    await submitSections([section.id]);
                    return { message: "Section sent for approval." };
                  })}
                  variant="outline"
                >
                  Send for approval
                </Button>
              ) : null}
              {isClientSuperAdmin && awaitingReview ? (
                <>
                  <Button disabled={busy} onClick={() => setReview("reject")} variant="outline">
                    Reject
                  </Button>
                  <Button disabled={busy} onClick={() => setReview("approve")}>
                    Approve
                  </Button>
                </>
              ) : null}
              {isClientSuperAdmin ? (
                <Button disabled={busy} onClick={handleDelete} variant="outline">
                  Delete
                </Button>
              ) : null}
            </div>
          </>
        )}
      </Panel>

      <ReviewDialog
        action={review ?? "approve"}
        count={1}
        loading={busy}
        onClose={() => setReview(null)}
        onConfirm={handleReview}
        open={review !== null}
      />
    </Shell>
  );
}
