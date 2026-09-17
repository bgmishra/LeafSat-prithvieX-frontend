"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Inbox, Undo2 } from "lucide-react";
import { getErrorMessage } from "@/api/client";
import { Button } from "@/components/ui/button";
import { ErrorMessage, Panel } from "@/components/ui";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationsRead,
  type AppNotification,
  type NotificationKind,
} from "@/lib/notifications";

const ICONS: Record<NotificationKind, typeof Inbox> = {
  section_submitted: Inbox,
  section_approved: CheckCircle2,
  section_rejected: Undo2,
};

const TONES: Record<NotificationKind, string> = {
  section_submitted: "bg-amber-50 text-amber-700",
  section_approved: "bg-emerald-50 text-emerald-700",
  section_rejected: "bg-red-50 text-red-700",
};

function when(value: string) {
  const created = new Date(value);
  const minutes = Math.round((Date.now() - created.getTime()) / 60000);

  if (minutes < 1) {
    return "just now";
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  if (minutes < 60 * 24) {
    return `${Math.round(minutes / 60)}h ago`;
  }
  return created.toLocaleDateString();
}

export function NotificationsFeed({ onChanged }: { onChanged?: () => void }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setNotifications(await listNotifications(unreadOnly));
      setError("");
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [unreadOnly]);

  useEffect(() => {
    // Deferred so the first render settles before refresh() touches state.
    queueMicrotask(() => {
      void refresh();
    });
  }, [refresh]);

  const unreadCount = notifications.filter((item) => !item.is_read).length;

  async function run(work: () => Promise<unknown>) {
    setBusy(true);
    try {
      await work();
      await refresh();
      onChanged?.();
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { label: "All", value: false },
            { label: "Unread", value: true },
          ].map((filter) => (
            <button
              className={`min-h-9 rounded-md px-3 text-sm font-semibold transition ${
                unreadOnly === filter.value
                  ? "bg-teal-50 text-teal-800"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
              key={filter.label}
              onClick={() => {
                setLoading(true);
                setUnreadOnly(filter.value);
              }}
              type="button"
            >
              {filter.label}
            </button>
          ))}
        </div>

        <Button
          disabled={busy || unreadCount === 0}
          onClick={() => run(markAllNotificationsRead)}
          size="sm"
          variant="outline"
        >
          Mark all read
        </Button>
      </div>

      <div className="mt-4">
        <ErrorMessage message={error} />
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-slate-500">Loading notifications...</p>
      ) : notifications.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">
          {unreadOnly
            ? "Nothing unread. You are up to date."
            : "No notifications yet. You will hear when a section is sent for approval or reviewed."}
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-slate-100">
          {notifications.map((item) => {
            const Icon = ICONS[item.kind] ?? Inbox;

            return (
              <li
                className={`flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between ${
                  item.is_read ? "" : "-mx-2 rounded-md bg-teal-50/40 px-2"
                }`}
                key={item.id}
              >
                <div className="flex min-w-0 gap-3">
                  <span
                    className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${
                      TONES[item.kind] ?? "bg-slate-100 text-slate-600"
                    }`}
                  >
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p
                      className={`text-sm ${
                        item.is_read ? "text-slate-600" : "font-semibold text-slate-950"
                      }`}
                    >
                      {item.message}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.kind_label} · {when(item.created_at)}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2 sm:pl-4">
                  {item.section ? (
                    <Link
                      className="text-sm font-medium text-teal-700 hover:text-teal-800"
                      href="/manage-sections"
                    >
                      Open sections
                    </Link>
                  ) : null}
                  {item.is_read ? null : (
                    <Button
                      disabled={busy}
                      onClick={() => run(() => markNotificationsRead([item.id]))}
                      size="sm"
                      variant="outline"
                    >
                      Mark read
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
