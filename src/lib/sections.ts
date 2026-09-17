"use client";

import { apiRequest } from "@/api/client";

const SECTIONS_URL = "/api/v1/railway-segments/";

export type SectionStatus = "draft" | "pending_approval" | "approved" | "rejected";

export const SECTION_STATUS_LABELS: Record<SectionStatus, string> = {
  draft: "Draft",
  pending_approval: "Pending approval",
  approved: "Approved",
  rejected: "Rejected",
};

/** Statuses an engineer or client super admin can send up for approval. */
export const SENDABLE_STATUSES: SectionStatus[] = ["draft", "rejected"];

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
