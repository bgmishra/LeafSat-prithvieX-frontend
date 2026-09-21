"use client";

import { apiRequest } from "@/api/client";

const SECTIONS_URL = "/api/v1/railway-segments/";
const BULK_UPLOADS_URL = "/api/v1/bulk-uploads/";

export type SectionStatus = "draft" | "pending_approval" | "approved" | "rejected";

export const SECTION_STATUS_LABELS: Record<SectionStatus, string> = {
  draft: "Draft",
  pending_approval: "Pending approval",
  approved: "Approved",
  rejected: "Rejected",
};

/** Statuses an engineer or client super admin can send up for approval. */
export const SENDABLE_STATUSES: SectionStatus[] = ["draft", "rejected"];

/**
 * The attribute columns a section carries, in the order they are shown.
 *
 * One list drives three things that have to agree: the single-section form, the
 * column names advertised on the bulk upload tab, and the edit form. The names
 * match the columns the backend reads out of an uploaded GeoPackage
 * (ROW_ATTRIBUTE_FIELDS in leafsat/serializers.py), so a file prepared from what
 * the upload tab lists is a file the importer understands.
 */
export const SECTION_ATTRIBUTE_FIELDS = [
  { label: "Railway ID", name: "railway_id", hint: "Your reference for the line" },
  { label: "Railway name", name: "railway_name", hint: "The line this section runs on" },
  { label: "Starting point", name: "starting_point_name", hint: "Where the line starts" },
  { label: "End point", name: "end_point_name", hint: "Where the line ends" },
  { label: "Section start", name: "section_start_name", hint: "Where this section starts" },
  { label: "Section end", name: "section_end_name", hint: "Where this section ends" },
] as const;

export type RailwaySection = {
  id: number;
  organization: number;
  organization_name: string;
  status: SectionStatus;
  status_label: string;
  is_editable: boolean;
  created_by_name: string | null;
  created_by_email: string | null;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  review_note: string;
  submitted_at: string | null;
  created_at: string | null;
  railway_id: string;
  railway_name: string;
  starting_point_name: string;
  end_point_name: string;
  section_start_name: string;
  section_end_name: string;
  section_polygon: unknown;
  /** The upload this arrived in, or null when it was created on its own. */
  bulk_upload: number | null;
  /** Oldest first. Only sent by the detail endpoint, not the list. */
  events?: SectionEvent[];
};

/** One step in a section's approval history. */
export type SectionEvent = {
  id: number;
  action: "submitted" | "approved" | "rejected";
  action_label: string;
  actor_name: string | null;
  note: string;
  created_at: string;
};

/** One GeoPackage upload and a live tally of where its sections have got to. */
export type BulkUpload = {
  id: number;
  file_name: string;
  uploaded_by_name: string | null;
  /** Rows accepted at import time — not adjusted if sections are deleted later. */
  created_count: number;
  skipped_count: number;
  section_count: number;
  draft_count: number;
  pending_count: number;
  approved_count: number;
  rejected_count: number;
  created_at: string;
};

export type SectionAttributes = {
  railway_id?: string;
  railway_name?: string;
  starting_point_name?: string;
  end_point_name?: string;
  section_start_name?: string;
  section_end_name?: string;
};

export type WorkflowResponse = {
  message: string;
  updated_count: number;
  results: RailwaySection[];
};

export type BulkUploadResponse = {
  bulk_upload: BulkUpload;
  created_count: number;
  skipped_count: number;
  errors: Array<{ row: number; detail: string }>;
  results: RailwaySection[];
};

function unwrap<T>(payload: T[] | { results?: T[] } | null): T[] {
  return Array.isArray(payload) ? payload : (payload?.results ?? []);
}

export async function listSections(status?: SectionStatus | "") {
  const query = status ? `?status=${status}` : "";
  const payload = await apiRequest<RailwaySection[] | { results?: RailwaySection[] }>(
    `${SECTIONS_URL}${query}`,
    { auth: true },
  );
  return unwrap(payload);
}

export async function listBulkUploads() {
  const payload = await apiRequest<BulkUpload[] | { results?: BulkUpload[] }>(
    BULK_UPLOADS_URL,
    { auth: true },
  );
  return unwrap(payload);
}

/** The sections that arrived in one upload. Still subject to the usual
 * visibility rules — naming a batch cannot widen what you may see. */
export async function listSectionsInUpload(uploadId: number) {
  const payload = await apiRequest<RailwaySection[] | { results?: RailwaySection[] }>(
    `${SECTIONS_URL}?bulk_upload=${uploadId}`,
    { auth: true },
  );
  return unwrap(payload);
}

/** One section by id. 404s when it does not exist *or* when the caller may not
 * see it — the server deliberately does not distinguish the two. */
export function getSection(id: number) {
  return apiRequest<RailwaySection>(`${SECTIONS_URL}${id}/`, { auth: true });
}

/**
 * A boundary arrives either as an uploaded GeoPackage or as a polygon drawn on
 * the map, so the request is multipart only when there is a file to carry.
 */
export function createSection(
  attributes: SectionAttributes,
  boundary: { file?: File; geojson?: unknown },
) {
  if (boundary.file) {
    const body = new FormData();
    for (const [key, value] of Object.entries(attributes)) {
      body.append(key, value ?? "");
    }
    body.append("boundary_file", boundary.file);

    return apiRequest<RailwaySection>(SECTIONS_URL, { auth: true, method: "POST", body });
  }

  return apiRequest<RailwaySection>(SECTIONS_URL, {
    auth: true,
    method: "POST",
    body: JSON.stringify({ ...attributes, boundary_geojson: boundary.geojson }),
  });
}

/**
 * Revise a section that has not been signed off yet. Attributes always go up;
 * the boundary only when the author actually replaced it, so editing a name does
 * not force them to redraw the polygon.
 */
export function updateSection(
  id: number,
  attributes: SectionAttributes,
  boundary?: { file?: File; geojson?: unknown },
) {
  const url = `${SECTIONS_URL}${id}/`;

  if (boundary?.file) {
    const body = new FormData();
    for (const [key, value] of Object.entries(attributes)) {
      body.append(key, value ?? "");
    }
    body.append("boundary_file", boundary.file);

    return apiRequest<RailwaySection>(url, { auth: true, method: "PATCH", body });
  }

  return apiRequest<RailwaySection>(url, {
    auth: true,
    method: "PATCH",
    body: JSON.stringify(
      boundary?.geojson ? { ...attributes, boundary_geojson: boundary.geojson } : attributes,
    ),
  });
}

export function deleteSection(id: number) {
  return apiRequest<null>(`${SECTIONS_URL}${id}/`, { auth: true, method: "DELETE" });
}

export function bulkUploadSections(file: File) {
  const body = new FormData();
  body.append("file", file);

  return apiRequest<BulkUploadResponse>(`${SECTIONS_URL}bulk-upload/`, {
    auth: true,
    method: "POST",
    body,
  });
}

export function submitSections(ids: number[]) {
  return apiRequest<WorkflowResponse>(`${SECTIONS_URL}submit/`, {
    auth: true,
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}

export function approveSections(ids: number[], note = "") {
  return apiRequest<WorkflowResponse>(`${SECTIONS_URL}approve/`, {
    auth: true,
    method: "POST",
    body: JSON.stringify({ ids, note }),
  });
}

export function rejectSections(ids: number[], note: string) {
  return apiRequest<WorkflowResponse>(`${SECTIONS_URL}reject/`, {
    auth: true,
    method: "POST",
    body: JSON.stringify({ ids, note }),
  });
}
