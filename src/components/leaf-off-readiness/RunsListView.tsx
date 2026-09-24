"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Layers, Play, RotateCw } from "lucide-react";
import { ApiError, getErrorMessage } from "@/api/client";
import { Panel } from "@/components/ui";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Pagination, PaginationContent, PaginationInfo } from "@/components/ui/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateKey, formatTime, isToday, pluralize } from "@/lib/format";
import {
  MODEL_RUNS_PAGE_SIZE,
  isActiveRunStatus,
  listModelRuns,
  resultLabel,
  type ModelRun,
  type ModelRunResult,
  type Paginated,
} from "@/lib/model-runs";
import { cn } from "@/lib/utils";
import { IconEmptyState } from "./IconEmptyState";
import { useModelProduct, type ModelProduct } from "./model-product";
import { RESULTS_HEADING_ID, RUN_FILTERS, type RunsFilterKey } from "./results-routes";
import { RunStatusBadge } from "./RunStatusBadge";
import { PRIMARY_BUTTON_CLASS } from "./RunStatusPanel";
import { POLL_INTERVAL_MS, usePolling } from "./usePolling";

type ListState = {
  key: string;
  data: Paginated<ModelRun> | null;
  error: string;
  status: number | null;
};

/** "Auto-refreshing" while something is moving, else when it last updated. */
export function PollingIndicator({ active, lastUpdated }: { active: boolean; lastUpdated: Date | null }) {
  return (
    <span
      aria-live="off"
      className="inline-flex items-center gap-1.5 text-xs text-slate-500"
      title={`Refreshes every ${POLL_INTERVAL_MS / 1000} seconds while a run is active`}
    >
      {active ? (
        <>
          <span aria-hidden="true" className="size-1.5 rounded-full bg-sky-500 motion-safe:animate-pulse" />
          Auto-refreshing
        </>
      ) : lastUpdated ? (
        `Updated ${lastUpdated.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`
      ) : null}
    </span>
  );
}

export function RefreshButton({ busy, label, onClick }: { busy: boolean; label: string; onClick: () => void }) {
  return (
    <Button aria-busy={busy} aria-label={label} onClick={onClick} size="icon-sm" title={label} type="button" variant="outline">
      <RotateCw aria-hidden="true" className={cn(busy && "motion-safe:animate-spin motion-reduce:animate-none")} />
    </Button>
  );
}

function startedBy(run: ModelRun) {
  return run.created_by_name || run.created_by_email || "—";
}

type SectionRow = { run: ModelRun; result: ModelRunResult };
type RunDateGroup = { date: string; runs: ModelRun[]; rows: SectionRow[] };

/**
 * Runs bucketed by the local day they were created, as "YYYY-MM-DD".
 *
 * The API already returns them newest first, so walking the page in order keeps
 * both the groups and the runs inside each group newest first. Grouping is per
 * page: a day that straddles a page break shows up at the foot of one page and
 * the head of the next.
 */
function groupRunsByDate(runs: ModelRun[], filter: RunsFilterKey): RunDateGroup[] {
  const wanted = RUN_FILTERS.find((item) => item.key === filter)?.resultStatuses ?? [];
  const keep = (result: ModelRunResult) => wanted.length === 0 || wanted.includes(result.status);

  const groups: RunDateGroup[] = [];
  for (const run of runs) {
    const rows = run.results.filter(keep).map((result) => ({ result, run }));
    if (rows.length === 0) {
      continue;
    }
    const date = formatDateKey(run.created_at);
    const last = groups.at(-1);
    if (last?.date === date) {
      last.runs.push(run);
      last.rows.push(...rows);
    } else {
      groups.push({ date, runs: [run], rows });
    }
  }
  return groups;
}

function isYesterday(value: string) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return formatDateKey(value) === formatDateKey(yesterday.toISOString());
}

/** "2026-09-24", plus a Today / Yesterday hint and how many runs the day holds. */
function DateGroupLabel({ group }: { group: RunDateGroup }) {
  const sample = group.runs[0].created_at;
  const hint = isToday(sample) ? "Today" : isYesterday(sample) ? "Yesterday" : null;
  return (
    <span className="flex flex-wrap items-center gap-2">
      <CalendarDays aria-hidden="true" className="size-4 text-teal-700" />
      <time className="font-mono text-sm font-semibold tabular-nums text-slate-950" dateTime={group.date}>
        {group.date}
      </time>
      {hint ? (
        <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-700">{hint}</span>
      ) : null}
      <span className="text-xs text-slate-500">
        {pluralize(group.rows.length, "section result")} · {pluralize(group.runs.length, "run")}
      </span>
    </span>
  );
}

export function RunsListView({ enabled, filter, page }: { enabled: boolean; filter: RunsFilterKey; page: number }) {
  const product = useModelProduct();
  const { modelType, resultsHref, runActionLabel, runModelPath } = product;
  const key = `${page}|${filter}`;
  const [state, setState] = useState<ListState | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [pollError, setPollError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchPage = useCallback(
    () =>
      listModelRuns({
        page,
        pageSize: MODEL_RUNS_PAGE_SIZE,
        status: RUN_FILTERS.find((item) => item.key === filter)?.statuses ?? [],
        // Always scoped to this product, so readiness and forecast runs never mix.
        modelType,
      }),
    [filter, modelType, page],
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let active = true;
    fetchPage()
      .then((data) => {
        if (active) {
          setState({ data, error: "", key, status: null });
          setLastUpdated(new Date());
          setPollError(false);
        }
      })
      .catch((caught) => {
        if (active) {
          setState({
            data: null,
            error: getErrorMessage(caught),
            key,
            status: caught instanceof ApiError ? caught.status : null,
          });
        }
      });
    return () => {
      active = false;
    };
  }, [enabled, fetchPage, key]);

  const current = state?.key === key ? state : null;
  // Keep showing the previous page while the next one loads; never flash a skeleton.
  const shownData = current?.data ?? state?.data ?? null;
  const runs = shownData?.results ?? [];
  const dateGroups = groupRunsByDate(runs, filter);
  const anyActive = runs.some((run) => isActiveRunStatus(run.status));
  const loading = enabled && !current;

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await fetchPage();
      setState({ data, error: "", key, status: null });
      setLastUpdated(new Date());
      setPollError(false);
    } catch (caught) {
      setPollError(true);
      setState((previous) =>
        previous?.key === key && previous.data
          ? previous
          : { data: null, error: getErrorMessage(caught), key, status: caught instanceof ApiError ? caught.status : null },
      );
    } finally {
      setRefreshing(false);
    }
  }, [fetchPage, key]);

  usePolling(refresh, enabled && Boolean(current?.data) && anyActive);

  const count = shownData?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(count / MODEL_RUNS_PAGE_SIZE));
  const firstIndex = count === 0 ? 0 : (page - 1) * MODEL_RUNS_PAGE_SIZE + 1;
  const lastIndex = Math.min(count, page * MODEL_RUNS_PAGE_SIZE);
  const pageOutOfRange = current?.status === 404 && page > 1;

  return (
    <div className="grid gap-6 p-4 sm:p-6">
      <ResultsHeader
        product={product}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <PollingIndicator active={anyActive} lastUpdated={lastUpdated} />
            <RefreshButton busy={refreshing} label="Refresh runs" onClick={() => void refresh()} />
            <Link className={buttonVariants({ className: PRIMARY_BUTTON_CLASS })} href={runModelPath}>
              <Play aria-hidden="true" />
              {runActionLabel}
            </Link>
          </div>
        }
      />

      <Panel className="overflow-hidden [&>div]:p-0">
        <nav aria-label="Filter runs" className="flex gap-1 overflow-x-auto border-b border-slate-200 px-3">
          {RUN_FILTERS.map((item) => {
            const selected = item.key === filter;
            return (
              <Link
                aria-current={selected ? "page" : undefined}
                className={cn(
                  "-mb-px flex min-h-11 shrink-0 items-center border-b-2 px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-600",
                  selected ? "border-teal-700 text-teal-700" : "border-transparent text-slate-500 hover:text-slate-800",
                )}
                href={resultsHref({ filter: item.key })}
                key={item.key}
                scroll={false}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {pollError && shownData ? (
          <p className="border-b border-slate-200 bg-slate-50 px-5 py-2 text-xs text-slate-500">
            Couldn&apos;t refresh the list. Retrying…
          </p>
        ) : null}

        <div className="p-5">
          {loading && !shownData ? (
            <RunsSkeleton />
          ) : pageOutOfRange ? (
            <IconEmptyState
              action={
                <Link className={buttonVariants({ variant: "outline" })} href={resultsHref({ filter })}>
                  Go to page 1
                </Link>
              }
              description="This page is past the end of the list."
              icon={Layers}
              title="No runs on this page"
            />
          ) : current?.error && !shownData ? (
            <Alert className="flex flex-wrap items-center justify-between gap-3" role="alert" variant="destructive">
              <span>
                We couldn&apos;t load model runs.
                <span className="block text-xs opacity-80">{current.error}</span>
              </span>
              <Button onClick={() => void refresh()} size="sm" type="button" variant="outline">
                <RotateCw aria-hidden="true" />
                Retry
              </Button>
            </Alert>
          ) : dateGroups.length === 0 ? (
            filter === "all" ? (
              <IconEmptyState
                action={
                  <Link className={buttonVariants({ className: PRIMARY_BUTTON_CLASS })} href={runModelPath}>
                    <Play aria-hidden="true" />
                    {runActionLabel}
                  </Link>
                }
                description="Runs you and your team start appear here."
                icon={Layers}
                title="No model runs yet"
              />
            ) : (
              <p className="py-8 text-center text-sm text-slate-500">No runs in this view.</p>
            )
          ) : (
            <div aria-busy={loading} className={cn(loading && "opacity-60 transition-opacity")}>
              <DateAccordion groups={dateGroups} product={product} />
            </div>
          )}
        </div>

        {count > 0 ? (
          <Pagination className="border-t border-slate-200 px-5 py-3">
            <PaginationInfo>
              Showing {firstIndex}–{lastIndex} of {count} · Page {page} of {totalPages}
            </PaginationInfo>
            <PaginationContent>
              <PageLink disabled={page <= 1} href={resultsHref({ filter, page: page - 1 })} label="Previous">
                <ChevronLeft aria-hidden="true" />
              </PageLink>
              <PageLink disabled={page >= totalPages} href={resultsHref({ filter, page: page + 1 })} label="Next" trailing>
                <ChevronRight aria-hidden="true" />
              </PageLink>
            </PaginationContent>
          </Pagination>
        ) : null}
      </Panel>
    </div>
  );
}

/** Same look as the shared PageHeader, with the h1 as the focus target. */
function ResultsHeader({ action, product }: { action: React.ReactNode; product: ModelProduct }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">{product.name}</p>
        <h1
          className="mt-2 text-3xl font-semibold text-slate-950 outline-none sm:text-4xl"
          id={RESULTS_HEADING_ID}
          tabIndex={-1}
        >
          Model results
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
          {product.resultsDescription}
        </p>
      </div>
      {action}
    </div>
  );
}

function PageLink({
  children,
  disabled,
  href,
  label,
  trailing = false,
}: {
  children: React.ReactNode;
  disabled: boolean;
  href: string;
  label: string;
  trailing?: boolean;
}) {
  const content = trailing ? (
    <>
      {label}
      {children}
    </>
  ) : (
    <>
      {children}
      {label}
    </>
  );
  if (disabled) {
    return (
      <span aria-disabled="true" className={buttonVariants({ className: "pointer-events-none opacity-50", size: "sm", variant: "outline" })}>
        {content}
      </span>
    );
  }
  return (
    <Link className={buttonVariants({ size: "sm", variant: "outline" })} href={href}>
      {content}
    </Link>
  );
}

/**
 * One collapsible panel per run date, holding every section result from that day.
 *
 * The newest day starts open. Open state lives here rather than in the DOM so
 * the five-second poll re-rendering the list never snaps a panel shut.
 */
function DateAccordion({ groups, product }: { groups: RunDateGroup[]; product: ModelProduct }) {
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const isOpen = (date: string, index: number) => toggled[date] ?? index === 0;

  return (
    <div className="space-y-3">
      {groups.map((group, index) => {
        const open = isOpen(group.date, index);
        const panelId = `runs-${group.date}`;
        return (
          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white" key={group.date}>
            <h2>
              <button
                aria-controls={panelId}
                aria-expanded={open}
                className="flex min-h-12 w-full items-center justify-between gap-3 bg-slate-50 px-4 py-3 text-left transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-600"
                onClick={() => setToggled((previous) => ({ ...previous, [group.date]: !open }))}
                type="button"
              >
                <DateGroupLabel group={group} />
                <ChevronDown
                  aria-hidden="true"
                  className={cn("size-4 shrink-0 text-slate-500 transition-transform motion-reduce:transition-none", open && "rotate-180")}
                />
              </button>
            </h2>
            {open ? (
              <div className="border-t border-slate-200" id={panelId}>
                <SectionResultsTable product={product} rows={group.rows} />
                <SectionResultsCards product={product} rows={group.rows} />
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

function SectionResultsTable({ product, rows }: { product: ModelProduct; rows: SectionRow[] }) {
  const { columns, showTime = true } = product.runsList;
  const { resultsHref } = product;
  return (
    <div className="hidden md:block">
      <Table className="min-w-[760px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Section</TableHead>
            <TableHead>Run</TableHead>
            <TableHead>Status</TableHead>
            {columns.map((column) => (
              <TableHead key={column.key}>{column.header}</TableHead>
            ))}
            {showTime ? <TableHead>Time</TableHead> : null}
            <TableHead>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ result, run }) => (
            <TableRow key={result.id}>
              <TableCell className="max-w-72">
                <span className="block truncate font-medium text-slate-950" title={resultLabel(result)}>
                  {resultLabel(result)}
                </span>
                {result.status === "failed" && result.error_message ? (
                  <span className="block truncate text-xs text-red-700" title={result.error_message}>
                    {result.error_message}
                  </span>
                ) : null}
              </TableCell>
              <TableCell>
                <Link
                  className="font-mono tabular-nums text-slate-600 underline-offset-4 hover:text-teal-700 hover:underline"
                  href={resultsHref({ run: run.id })}
                  title={`Started by ${startedBy(run)}`}
                >
                  #{run.id}
                </Link>
              </TableCell>
              <TableCell>
                <RunStatusBadge status={result.status} />
              </TableCell>
              {columns.map((column) => (
                <TableCell className={column.cellClassName} key={column.key}>
                  {column.cell(result, run)}
                </TableCell>
              ))}
              {showTime ? (
                <TableCell className="whitespace-nowrap" title={new Date(run.created_at).toLocaleString()}>
                  {formatTime(run.created_at)}
                </TableCell>
              ) : null}
              <TableCell className="text-right">
                <Link
                  aria-label={`View map for ${resultLabel(result)}`}
                  className={buttonVariants({ size: "sm", variant: "outline" })}
                  href={resultsHref({ run: run.id, section: result.section })}
                >
                  View map
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function SectionResultsCards({ product, rows }: { product: ModelProduct; rows: SectionRow[] }) {
  const { resultsHref } = product;
  const { showTime = true } = product.runsList;
  return (
    <ul className="divide-y divide-slate-200 md:hidden">
      {rows.map(({ result, run }) => (
        <li key={result.id}>
          <Link
            className="block space-y-1.5 p-4 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-600"
            href={resultsHref({ run: run.id, section: result.section })}
          >
            <span className="flex items-start justify-between gap-2">
              <span className="text-sm font-semibold text-slate-950">{resultLabel(result)}</span>
              <RunStatusBadge status={result.status} />
            </span>
            <span className="block text-xs text-slate-500">
              Run #{run.id} · {showTime ? `${formatTime(run.created_at)} · ` : ""}
              {product.runsList.cardMeta(result, run)}
            </span>
            {result.status === "failed" && result.error_message ? (
              <span className="block text-xs text-red-700">{result.error_message}</span>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function RunsSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading model runs" className="space-y-3">
      {Array.from({ length: 3 }, (_, index) => (
        <div className="space-y-3 rounded-lg border border-slate-200 p-4" key={index}>
          <div className="flex items-center justify-between">
            <span className="h-4 w-24 rounded bg-slate-200 motion-safe:animate-pulse" />
            <span className="h-5 w-20 rounded-full bg-slate-200 motion-safe:animate-pulse" />
          </div>
          <span className="block h-3 w-48 rounded bg-slate-200 motion-safe:animate-pulse" />
          <span className="block h-1.5 w-full rounded-full bg-slate-200 motion-safe:animate-pulse" />
        </div>
      ))}
    </div>
  );
}
