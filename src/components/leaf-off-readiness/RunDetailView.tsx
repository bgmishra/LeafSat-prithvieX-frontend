"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FlaskConical, Map as MapIcon, RotateCw, SearchX } from "lucide-react";
import { Panel } from "@/components/ui";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime, formatDuration } from "@/lib/format";
import { isActiveRunStatus, resultLabel, type ModelRunDetail, type ModelRunResult } from "@/lib/model-runs";
import { IconEmptyState } from "./IconEmptyState";
import { useModelProduct, type ModelProduct } from "./model-product";
import { RESULTS_HEADING_ID } from "./results-routes";
import { RunCountsCaption, RunStatusBadge, SyntheticBadge } from "./RunStatusBadge";
import { PollingIndicator, RefreshButton } from "./RunsListView";
import type { RunDetailState } from "./useRunDetail";

export const SYNTHETIC_NOTICE_TITLE = "Synthetic test output.";

export function SyntheticNotice({ className }: { className?: string }) {
  const { syntheticNoticeBody } = useModelProduct();
  return (
    <div
      className={`flex gap-2.5 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900 ${className ?? ""}`}
    >
      <FlaskConical aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <p>
        <strong className="font-semibold">{SYNTHETIC_NOTICE_TITLE}</strong> {syntheticNoticeBody}
      </p>
    </div>
  );
}

function ErrorText({ message }: { message: string }) {
  const [expanded, setExpanded] = useState(false);
  const long = message.length > 200;
  return (
    <div className="text-xs text-red-700">
      <p className={long && !expanded ? "line-clamp-2" : "whitespace-pre-wrap break-words"}>{message}</p>
      {long ? (
        <button
          aria-expanded={expanded}
          className="mt-1 font-semibold underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
          onClick={() => setExpanded((value) => !value)}
          type="button"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      ) : null}
    </div>
  );
}

function ViewMapAction({ result, runId }: { result: ModelRunResult; runId: number }) {
  const { mapNoun, resultsHref } = useModelProduct();
  const pending = isActiveRunStatus(result.status);
  if (pending) {
    return <span className="text-xs text-slate-500">Waiting…</span>;
  }
  const failed = result.status === "failed";
  const name = result.section_railway_id || result.section_label;
  return (
    <Link
      aria-label={failed ? `View details for ${name}` : `View ${mapNoun} for ${name}`}
      className={buttonVariants({ size: "sm", variant: "outline" })}
      href={resultsHref({ run: runId, section: result.section })}
    >
      <MapIcon aria-hidden="true" />
      {failed ? "Details" : "View map"}
    </Link>
  );
}

export function RunDetailView({ detail, runId }: { detail: RunDetailState; runId: number }) {
  const product = useModelProduct();
  const { resultsHref } = product;
  const { error, lastUpdated, loading, notFound, pollError, refresh, refreshing, run } = detail;

  return (
    <div className="grid gap-6 p-4 sm:p-6">
      <div>
        <Link className={buttonVariants({ className: "-ml-2 text-slate-600", size: "sm", variant: "ghost" })} href={resultsHref({})}>
          <ArrowLeft aria-hidden="true" />
          All runs
        </Link>
      </div>

      {loading ? (
        <>
          <h1 className="text-3xl font-semibold text-slate-950 outline-none" id={RESULTS_HEADING_ID} tabIndex={-1}>
            Run #{runId}
          </h1>
          <Panel>
            <p aria-busy="true" className="py-10 text-center text-sm text-slate-500">
              Loading run…
            </p>
          </Panel>
        </>
      ) : notFound ? (
        <>
          <h1 className="sr-only" id={RESULTS_HEADING_ID} tabIndex={-1}>
            Run not found
          </h1>
          <IconEmptyState
            action={
              <Link className={buttonVariants({ variant: "outline" })} href={resultsHref({})}>
                All runs
              </Link>
            }
            description="It may have been removed, or it belongs to another company."
            icon={SearchX}
            title="Run not found"
          />
        </>
      ) : !run ? (
        <>
          <h1 className="text-3xl font-semibold text-slate-950 outline-none" id={RESULTS_HEADING_ID} tabIndex={-1}>
            Run #{runId}
          </h1>
          <Alert className="flex flex-wrap items-center justify-between gap-3" role="alert" variant="destructive">
            <span>
              We couldn&apos;t load this run.
              {error ? <span className="block text-xs opacity-80">{error}</span> : null}
            </span>
            <Button onClick={() => void refresh()} size="sm" type="button" variant="outline">
              <RotateCw aria-hidden="true" />
              Retry
            </Button>
          </Alert>
        </>
      ) : (
        <RunDetailBody
          product={product}
          lastUpdated={lastUpdated}
          pollError={pollError}
          refresh={refresh}
          refreshing={refreshing}
          run={run}
        />
      )}
    </div>
  );
}

function RunDetailBody({
  lastUpdated,
  pollError,
  product,
  refresh,
  refreshing,
  run,
}: {
  lastUpdated: Date | null;
  product: ModelProduct;
  pollError: boolean;
  refresh: () => Promise<void>;
  refreshing: boolean;
  run: ModelRunDetail;
}) {
  const counts = run.result_counts;
  const anySynthetic = run.results.some((result) => result.is_synthetic || product.primaryInfo(result).is_synthetic);
  const { columns, facts } = product.runDetail;
  const { resultsHref } = product;
  const active = isActiveRunStatus(run.status);

  return (
    <>
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold text-slate-950 outline-none" id={RESULTS_HEADING_ID} tabIndex={-1}>
            Run #{run.id}
          </h1>
          <span aria-live="polite">
            <RunStatusBadge status={run.status} />
          </span>
          {anySynthetic ? <SyntheticBadge /> : null}
          <div className="ml-auto flex items-center gap-2">
            <PollingIndicator active={active} lastUpdated={lastUpdated} />
            <RefreshButton busy={refreshing} label="Refresh run" onClick={() => void refresh()} />
          </div>
        </div>
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
          <div className="flex gap-1.5">
            <dt className="text-slate-500">Started by</dt>
            <dd className="font-medium text-slate-800">{run.created_by_name || run.created_by_email || "—"}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="text-slate-500">Created</dt>
            <dd>{formatDateTime(run.created_at)}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="text-slate-500">Finished</dt>
            <dd>
              {run.finished_at
                ? `${formatDateTime(run.finished_at)} (${formatDuration(run.started_at ?? run.created_at, run.finished_at)})`
                : "—"}
            </dd>
          </div>
          {facts(run).map((fact) => (
            <div className="flex gap-1.5" key={fact.label}>
              <dt className="text-slate-500">{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
          <div className="flex gap-1.5">
            <dt className="text-slate-500">Model</dt>
            <dd>{run.model_type_label}</dd>
          </div>
        </dl>
        <RunCountsCaption counts={counts} />
        {pollError ? <p className="text-xs text-slate-500">Couldn&apos;t refresh the status. Retrying…</p> : null}
      </header>

      <div className="space-y-3">
        {run.status === "failed" ? (
          <Alert role="alert" variant="destructive">
            This run failed. {run.error_message}
          </Alert>
        ) : null}
        {run.status === "partially_failed" ? (
          <Alert variant="warning">
            {counts.failed} of {run.section_count} sections failed. The others finished and their maps are ready.
          </Alert>
        ) : null}
        {run.status === "queued" ? (
          <Alert>This run is waiting to start. Sections appear here as they&apos;re processed.</Alert>
        ) : null}
        {anySynthetic ? <SyntheticNotice /> : null}
      </div>

      <Panel className="overflow-hidden [&>div]:p-0">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-950">Sections</h2>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block">
          <Table className="min-w-[760px]">
            <TableHeader className="bg-slate-50">
              <TableRow className="hover:bg-slate-50">
                <TableHead>Section</TableHead>
                <TableHead>Status</TableHead>
                {columns.map((column) => (
                  <TableHead key={column.key}>{column.header}</TableHead>
                ))}
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {run.results.map((result) => (
                <TableRow className="align-top" key={result.id}>
                  <TableCell className="max-w-80 align-top">
                    <p className="font-medium text-slate-950">{resultLabel(result)}</p>
                    {result.section_railway_name ? (
                      <p className="text-xs text-slate-500">{result.section_railway_name}</p>
                    ) : null}
                    {result.error_message ? (
                      <div className="mt-1.5">
                        <ErrorText message={result.error_message} />
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell className="align-top">
                    <RunStatusBadge size="sm" status={result.status} />
                  </TableCell>
                  {columns.map((column) => (
                    <TableCell className="align-top" key={column.key}>
                      {column.cell(result, run)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right align-top">
                    <ViewMapAction result={result} runId={run.id} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile cards */}
        <ul className="divide-y divide-slate-100 md:hidden">
          {run.results.map((result) => {
            const pending = isActiveRunStatus(result.status);
            return (
              <li className="space-y-2 p-4" key={result.id}>
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-slate-950">{resultLabel(result)}</p>
                  <RunStatusBadge size="sm" status={result.status} />
                </div>
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                  {columns.map((column) => (
                    <Fragment key={column.key}>
                      <dt className="text-slate-500">{column.header}</dt>
                      <dd>{column.cell(result, run)}</dd>
                    </Fragment>
                  ))}
                </dl>
                {result.error_message ? <ErrorText message={result.error_message} /> : null}
                {!pending ? (
                  <Link
                    className={buttonVariants({ className: "w-full", size: "sm", variant: "outline" })}
                    href={resultsHref({ run: run.id, section: result.section })}
                  >
                    <MapIcon aria-hidden="true" />
                    {result.status === "failed" ? "Details" : "View map"}
                  </Link>
                ) : null}
              </li>
            );
          })}
        </ul>

        {run.results.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">No sections in this run.</p>
        ) : null}
      </Panel>
    </>
  );
}
