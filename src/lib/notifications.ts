"use client";

import { apiRequest } from "@/api/client";
import type { ModelType } from "@/lib/model-runs";

const NOTIFICATIONS_URL = "/api/v1/notifications/";

export type NotificationKind =
  | "section_submitted"
  | "section_approved"
  | "section_rejected"
  | "model_run_finished"
  | "result_shared";

export type AppNotification = {
  id: number;
  kind: NotificationKind;
  kind_label: string;
  message: string;
  actor_name: string | null;
  /** Set only when the action concerned exactly one section. */
  section: number | null;
  section_label: string;
  /** How many sections the action covered; 1 means `section` is set. */
  section_count: number;
  section_status: string | null;
  /** Set for `model_run_finished` / `result_shared`: the run whose results the notice points at. */
  model_run: number | null;
  /** That run's product; null without a run (absent on older servers, treated as readiness). */
  model_type?: ModelType | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
};

function unwrap<T>(payload: T[] | { results?: T[] } | null): T[] {
  return Array.isArray(payload) ? payload : (payload?.results ?? []);
}

export async function listNotifications(unreadOnly = false) {
  const payload = await apiRequest<AppNotification[] | { results?: AppNotification[] }>(
    `${NOTIFICATIONS_URL}${unreadOnly ? "?unread=true" : ""}`,
    { auth: true },
  );
  return unwrap(payload);
}

export function getUnreadCount() {
  return apiRequest<{ unread_count: number }>(`${NOTIFICATIONS_URL}unread-count/`, {
    auth: true,
  });
}

export function markNotificationsRead(ids: number[]) {
  return apiRequest<{ updated_count: number; unread_count: number }>(
    `${NOTIFICATIONS_URL}mark-read/`,
    { auth: true, method: "POST", body: JSON.stringify({ ids }) },
  );
}

/**
 * Put notifications back in the unread pile. Deliberately one-at-a-time and
 * never "all": unread here is a to-do marker the reader sets on something they
 * want to come back to, not an undo for having read their feed.
 */
export function markNotificationsUnread(ids: number[]) {
  return apiRequest<{ updated_count: number; unread_count: number }>(
    `${NOTIFICATIONS_URL}mark-unread/`,
    { auth: true, method: "POST", body: JSON.stringify({ ids }) },
  );
}

export function markAllNotificationsRead() {
  return apiRequest<{ updated_count: number; unread_count: number }>(
    `${NOTIFICATIONS_URL}mark-read/`,
    { auth: true, method: "POST", body: JSON.stringify({ all: true }) },
  );
}
