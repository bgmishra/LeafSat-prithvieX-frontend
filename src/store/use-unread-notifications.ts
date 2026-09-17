"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getUnreadCount } from "@/lib/notifications";
import { useAuth } from "@/store/auth-provider";

const POLL_INTERVAL_MS = 60_000;

/**
 * The unread badge in the sidebar. Polled rather than pushed - approvals happen
 * on a human timescale, so a minute of latency costs nothing and this needs no
 * socket infrastructure. Also refreshes on navigation, so acting on a
 * notification and returning shows the new count straight away.
 */
export function useUnreadNotifications(enabled: boolean) {
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();
  const [count, setCount] = useState(0);
  const active = enabled && isAuthenticated;

  const refresh = useCallback(async () => {
    if (!active) {
      setCount(0);
      return;
    }

    try {
      const { unread_count: unread } = await getUnreadCount();
      setCount(unread);
    } catch {
      // A failed badge poll is not worth surfacing; keep the last known count.
    }
  }, [active]);

  useEffect(() => {
    let cancelled = false;

    // Deferred so the first render settles before refresh() touches state.
    queueMicrotask(() => {
      if (!cancelled) {
        void refresh();
      }
    });

    if (!active) {
      return () => {
        cancelled = true;
      };
    }

    const timer = window.setInterval(() => {
      void refresh();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [active, pathname, refresh]);

  return { count, refresh };
}
