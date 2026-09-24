"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { TrainFront } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { useAuth } from "@/store/auth-provider";
import { IconEmptyState } from "./IconEmptyState";
import { RunDetailView } from "./RunDetailView";
import { PRIMARY_BUTTON_CLASS } from "./RunStatusPanel";
import { RESULTS_HEADING_ID, parseFilter } from "./results-routes";
import { RunsListView } from "./RunsListView";
import { SectionResultViewer } from "./SectionResultViewer";
import { useRunDetail } from "./useRunDetail";

function positiveInt(value: string | null) {
  const parsed = value ? Number(value) : NaN;
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Results: runs list → run detail → section viewer, addressed by search params
 * so deep links (the completion email), Back and refresh all work.
 */
export function ModelResultsWorkspace() {
  const searchParams = useSearchParams();
  const { isAuthenticated, isReady } = useAuth();
  const runId = positiveInt(searchParams.get("run"));
  const sectionId = positiveInt(searchParams.get("section"));
  const page = positiveInt(searchParams.get("page")) ?? 1;
  const filter = parseFilter(searchParams.get("filter"));
  const detail = useRunDetail(isAuthenticated ? runId : null);

  // Move focus to the new view's heading after an in-app navigation, so
  // keyboard and screen-reader users land in context.
  const viewKey = `${runId ?? ""}|${sectionId ?? ""}`;
  const firstViewRef = useRef(true);
  useEffect(() => {
    if (firstViewRef.current) {
      firstViewRef.current = false;
      return;
    }
    document.getElementById(RESULTS_HEADING_ID)?.focus();
  }, [viewKey]);

  if (isReady && !isAuthenticated) {
    return (
      <div className="p-4 sm:p-6">
        <IconEmptyState
          action={
            <Link className={buttonVariants({ className: PRIMARY_BUTTON_CLASS })} href="/login">
              Sign in
            </Link>
          }
          description="Your company's model runs appear here once you sign in."
          icon={TrainFront}
          title="Sign in to view model results"
        />
      </div>
    );
  }

  if (runId && sectionId) {
    return <SectionResultViewer detail={detail} key={`${runId}-${sectionId}`} runId={runId} sectionId={sectionId} />;
  }

  if (runId) {
    return <RunDetailView detail={detail} runId={runId} />;
  }

  return <RunsListView enabled={isReady && isAuthenticated} filter={filter} page={page} />;
}

