"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Inbox, Map as MapIcon, MessageSquareText, RotateCw } from "lucide-react";
import { ApiError, getErrorMessage } from "@/api/client";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatDateKey, formatTime, isToday, pluralize } from "@/lib/format";
import {
  MODEL_RUNS_PAGE_SIZE,
  listSharedResults,
  markSharedResultViewed,
  resultLabel,
  type Paginated,
  type SharedResult,
} from "@/lib/model-runs";
import { cn } from "@/lib/utils";
import { useAuth } from "@/store/auth-provider";
import { IconEmptyState } from "./IconEmptyState";
import { useModelProduct, type ModelProduct } from "./model-product";
import { RunStatusBadge, SyntheticBadge } from "./RunStatusBadge";

type DateGroup = { date: string; items: SharedResult[] };

/** Shares bucketed by the local day they were sent; the API already returns them newest first. */
function groupByDate(items: SharedResult[]): DateGroup[] {
  const groups: DateGroup[] = [];
  for (const item of items) {
    const date = formatDateKey(item.shared_at);
    const last = groups.at(-1);
    if (last?.date === date) {
      last.items.push(item);
    } else {
      groups.push({ date, items: [item] });
    }
  }
  return groups;
}

function isYesterday(value: string) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return formatDateKey(value) === formatDateKey(yesterday.toISOString());
}

/**
 * A field supervisor's inbox of section results colleagues have shared with
 * them. Opening one marks it viewed, which the sharer sees in the Share dialog.
 */
export function SharedResultsWorkspace() {
  const { isAuthenticated, isReady } = useAuth();
  const product = useModelProduct();
  const { modelType } = product;
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<SharedResult> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (target: number) => {
    try {
      // Only this product's shares, so readiness and forecast inboxes never mix.
      const next = await listSharedResults({ modelType, page: target });
      setData(next);
      setError("");
    } catch (caught) {
      // Past the last page (e.g. after items were unshared): step back one.
      if (caught instanceof ApiError && caught.status === 404 && target > 1) {
        setPage(target - 1);
        return;
      }
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [modelType]);

  useEffect(() => {
    if (isReady && isAuthenticated) {
      queueMicrotask(() => void load(page));
    }
  }, [isAuthenticated, isReady, load, page]);

  const items = data?.results ?? [];
  const count = data?.count ?? 0;
  const newCount = items.filter((item) => item.is_new).length;
  const totalPages = Math.max(1, Math.ceil(count / MODEL_RUNS_PAGE_SIZE));

  const open = (item: SharedResult) => {
    if (item.is_new) {
      // Fire and forget: navigation must not wait on it.
      void markSharedResultViewed(item.id).catch(() => undefined);
    }
  };

  return (
    <div className="grid gap-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">{product.name}</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950 sm:text-4xl">Shared model results</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
            {product.shared.description}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {newCount > 0 ? (
            <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800 ring-1 ring-teal-200">
              {newCount} new
            </span>
          ) : null}
          <Button
            aria-label="Refresh shared results"
            onClick={() => {
              setRefreshing(true);
              void load(page);
            }}
            size="icon-sm"
            title="Refresh"
            type="button"
            variant="outline"
          >
            <RotateCw aria-hidden="true" className={cn(refreshing && "motion-safe:animate-spin")} />
          </Button>
        </div>
      </div>

      {loading && !data ? (
        <div aria-busy="true" aria-label="Loading shared results" className="space-y-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div className="h-24 rounded-lg border border-slate-200 bg-white motion-safe:animate-pulse" key={index} />
          ))}
        </div>
      ) : error && !data ? (
        <Alert className="flex flex-wrap items-center justify-between gap-3" role="alert" variant="destructive">
          <span>
            We couldn&apos;t load your shared results.
            <span className="block text-xs opacity-80">{error}</span>
          </span>
          <Button onClick={() => void load(page)} size="sm" type="button" variant="outline">
            <RotateCw aria-hidden="true" />
            Retry
          </Button>
        </Alert>
      ) : items.length === 0 ? (
        <IconEmptyState
          description={product.shared.emptyDescription}
          icon={Inbox}
          title="Nothing shared with you yet"
        />
      ) : (
        <div className="space-y-6">
          {groupByDate(items).map((group) => (
            <section aria-labelledby={`shared-${group.date}`} key={group.date}>
              <h2 className="mb-2 flex items-center gap-2" id={`shared-${group.date}`}>
                <CalendarDays aria-hidden="true" className="size-4 text-teal-700" />
                <time className="font-mono text-sm font-semibold tabular-nums text-slate-950" dateTime={group.date}>
                  {group.date}
                </time>
                {isToday(group.items[0].shared_at) || isYesterday(group.items[0].shared_at) ? (
                  <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-700">
                    {isToday(group.items[0].shared_at) ? "Today" : "Yesterday"}
                  </span>
                ) : null}
                <span className="text-xs text-slate-500">{pluralize(group.items.length, "result")}</span>
              </h2>
              <ul className="space-y-3">
                {group.items.map((item) => (
                  <SharedResultCard item={item} key={item.id} onOpen={() => open(item)} product={product} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {count > MODEL_RUNS_PAGE_SIZE ? (
        <nav aria-label="Pages" className="flex items-center justify-between gap-3 text-sm text-slate-600">
          <span>
            Page {page} of {totalPages} · {pluralize(count, "result")}
          </span>
          <div className="flex gap-2">
            <Button disabled={page <= 1} onClick={() => setPage(page - 1)} size="sm" type="button" variant="outline">
              <ChevronLeft aria-hidden="true" />
              Previous
            </Button>
            <Button disabled={page >= totalPages} onClick={() => setPage(page + 1)} size="sm" type="button" variant="outline">
              Next
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
        </nav>
      ) : null}
    </div>
  );
}

function SharedResultCard({ item, onOpen, product }: { item: SharedResult; onOpen: () => void; product: ModelProduct }) {
  const { result, run } = item;
  const href = product.resultsHref({ run: run.id, section: result.section });
  const sender = item.shared_by_name || item.shared_by_email || "A colleague";

  return (
    <li
      className={cn(
        "relative rounded-lg border bg-white p-4 shadow-sm transition-colors hover:border-slate-300",
        item.is_new ? "border-teal-200 before:absolute before:inset-y-3 before:left-0 before:w-[3px] before:rounded-r-full before:bg-teal-500" : "border-slate-200",
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold text-slate-950">{resultLabel(result)}</h3>
            {item.is_new ? (
              <span className="rounded-full bg-teal-600 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
                New
              </span>
            ) : null}
            <RunStatusBadge size="sm" status={result.status} />
            {result.is_synthetic || product.primaryInfo(result).is_synthetic ? <SyntheticBadge /> : null}
          </div>
          <p className="text-sm text-slate-600">
            Shared by <span className="font-medium text-slate-800">{sender}</span> at {formatTime(item.shared_at)} · Run #
            {run.id}
            {product.shared.meta(item)}
          </p>
          {item.note ? (
            <p className="flex gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <MessageSquareText aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-slate-400" />
              <span className="whitespace-pre-line">{item.note}</span>
            </p>
          ) : null}
        </div>
        <Link
          className={buttonVariants({ className: "shrink-0 bg-teal-700 text-white hover:bg-teal-800", size: "sm" })}
          href={href}
          onClick={onOpen}
        >
          <MapIcon aria-hidden="true" />
          View map
        </Link>
      </div>
    </li>
  );
}
