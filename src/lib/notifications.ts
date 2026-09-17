"use client";

import { apiRequest } from "@/api/client";

const NOTIFICATIONS_URL = "/api/v1/notifications/";

export type NotificationKind =
  | "section_submitted"
  | "section_approved"
  | "section_rejected";

export type AppNotification = {
  id: number;
  kind: NotificationKind;
  kind_label: string;
  message: string;
  actor_name: string | null;
  /** Set only when the action concerned exactly one section. */
  section: number | null;
  section_label: string;
  section_status: string | null;
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

export function markAllNotificationsRead() {
  return apiRequest<{ updated_count: number; unread_count: number }>(
    `${NOTIFICATIONS_URL}mark-read/`,
    { auth: true, method: "POST", body: JSON.stringify({ all: true }) },
  );
}
