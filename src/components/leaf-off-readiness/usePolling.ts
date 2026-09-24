"use client";

import { useEffect, useRef } from "react";

export const POLL_INTERVAL_MS = 5000;

/**
 * Call `callback` every `intervalMs` while `active`. Pauses while the tab is
 * hidden and fires once straight away when it becomes visible again. Each tick
 * waits for the previous call to settle, so slow responses never stack up.
 */
export function usePolling(callback: () => Promise<unknown> | void, active: boolean, intervalMs = POLL_INTERVAL_MS) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!active) {
      return;
    }

    let timer: number | undefined;
    let cancelled = false;

    const schedule = () => {
      window.clearTimeout(timer);
      if (!cancelled && !document.hidden) {
        timer = window.setTimeout(tick, intervalMs);
      }
    };

    const tick = async () => {
      try {
        await callbackRef.current();
      } finally {
        schedule();
      }
    };

    const onVisibility = () => {
      if (document.hidden) {
        window.clearTimeout(timer);
      } else {
        void tick();
      }
    };

    schedule();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [active, intervalMs]);
}
