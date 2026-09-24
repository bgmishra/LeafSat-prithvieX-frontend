"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, getErrorMessage } from "@/api/client";
import { getModelRun, isActiveRunStatus, type ModelRunDetail } from "@/lib/model-runs";
import { usePolling } from "./usePolling";

type RunState = {
  id: number;
  run: ModelRunDetail | null;
  error: string;
  notFound: boolean;
};

/** Load one run (with outlines) and keep it fresh while it is still processing. */
export function useRunDetail(runId: number | null) {
  const [state, setState] = useState<RunState | null>(null);
  const [pollError, setPollError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    if (!runId) {
      return;
    }
    let active = true;
    getModelRun(runId)
      .then((run) => {
        if (active) {
          setState({ error: "", id: runId, notFound: false, run });
          setPollError(false);
          setLastUpdated(new Date());
        }
      })
      .catch((caught) => {
        if (active) {
          setState({
            error: getErrorMessage(caught),
            id: runId,
            notFound: caught instanceof ApiError && caught.status === 404,
            run: null,
          });
        }
      });
    return () => {
      active = false;
    };
  }, [runId]);

  const current = state && state.id === runId ? state : null;
  const run = current?.run ?? null;

  const refresh = useCallback(async () => {
    if (!runId) {
      return;
    }
    setRefreshing(true);
    try {
      const next = await getModelRun(runId);
      setState({ error: "", id: runId, notFound: false, run: next });
      setPollError(false);
      setLastUpdated(new Date());
    } catch (caught) {
      setState((previous) =>
        previous && previous.id === runId && previous.run
          ? previous
          : {
              error: getErrorMessage(caught),
              id: runId,
              notFound: caught instanceof ApiError && caught.status === 404,
              run: null,
            },
      );
      setPollError(true);
    } finally {
      setRefreshing(false);
    }
  }, [runId]);

  usePolling(refresh, Boolean(run && isActiveRunStatus(run.status)));

  return {
    error: current?.error ?? "",
    lastUpdated,
    loading: Boolean(runId) && !current,
    notFound: current?.notFound ?? false,
    pollError,
    refresh,
    refreshing,
    run,
  };
}

export type RunDetailState = ReturnType<typeof useRunDetail>;
