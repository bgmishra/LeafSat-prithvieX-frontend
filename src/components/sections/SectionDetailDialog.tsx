"use client";

import { GeoJsonMapPreview } from "@/admin/components/GeoJsonMapPreview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SECTION_STATUS_LABELS, type RailwaySection } from "@/lib/sections";

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

/**
 * The boundary and paperwork behind one section, so a client super admin can
 * see what they are signing off before they approve it rather than after.
 */
export function SectionDetailDialog({
  busy,
  canApprove,
  onApprove,
  onClose,
  onReject,
  section,
}: {
  busy?: boolean;
  canApprove: boolean;
  onApprove: (section: RailwaySection) => void;
  onClose: () => void;
  onReject: (section: RailwaySection) => void;
  section: RailwaySection | null;
}) {
  if (!section) {
    return null;
  }

  const awaitingReview = section.status === "pending_approval";

  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-slate-950/50">
      <div className="h-full w-full max-w-2xl overflow-y-auto bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">
              {section.railway_id || `Section ${section.id}`}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {text(section.railway_name)} · {section.organization_name}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Badge className={statusClasses(section)}>
              {SECTION_STATUS_LABELS[section.status]}
            </Badge>
            <button
              className="rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
              onClick={onClose}
              type="button"
            >
              Close
            </button>
          </div>
        </div>

        <div className="mt-5">
          <h3 className="text-sm font-semibold text-slate-950">Boundary</h3>
          <p className="mt-1 text-sm text-slate-500">
            The track section this record covers. Check it against the line before approving.
          </p>
          <div className="mt-3">
            <GeoJsonMapPreview geometry={section.section_polygon} />
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm sm:grid-cols-2">
          <Detail label="Railway ID" value={text(section.railway_id)} />
          <Detail label="Railway name" value={text(section.railway_name)} />
          <Detail label="Starting point" value={text(section.starting_point_name)} />
          <Detail label="End point" value={text(section.end_point_name)} />
          <Detail label="Section start" value={text(section.section_start_name)} />
          <Detail label="Section end" value={text(section.section_end_name)} />
        </dl>

        <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 rounded-md border border-slate-200 px-4 py-3 text-sm sm:grid-cols-2">
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
              {section.status === "rejected" ? "Sent back" : "Approval remark"}
            </p>
            <p className="mt-1">{section.review_note}</p>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-5">
          {canApprove && awaitingReview ? (
            <>
              <Button disabled={busy} onClick={() => onReject(section)} variant="outline">
                Send back
              </Button>
              <Button disabled={busy} onClick={() => onApprove(section)}>
                Approve
              </Button>
            </>
          ) : (
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
