"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertCircle, ArrowLeft, CalendarDays, CheckCircle2, Database, Download, ExternalLink, RefreshCw } from "lucide-react";

import { downloadProcessingJobData, getProcessingJob, type ProcessingJobStatusResponse } from "@/lib/api";
import { AoiWmsMap } from "@/components/AoiWmsMap";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function formatUtcDateTime(value?: string | null) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "short",
    second: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
    year: "numeric",
  }).format(date);
}

function formatDate(value?: string) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(date);
}

function formatArea(value?: number | null) {
  if (value === null || value === undefined) {
    return "Not available";
  }

  return `${new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(value)} ha`;
}

function statusDisplay(status: ProcessingJobStatusResponse["status"]) {
  const normalized = status || "PENDING";
  const labels = {
    FAILED: "Failed",
    PENDING: "Pending",
    RUNNING: "Processing",
    SUCCESS: "Completed",
  };
  const classes = {
    FAILED: "bg-red-50 text-red-700 ring-red-200",
    PENDING: "bg-slate-100 text-slate-700 ring-slate-200",
    RUNNING: "bg-amber-50 text-amber-700 ring-amber-200",
    SUCCESS: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  };

  return {
    label: labels[normalized],
    className: classes[normalized],
  };
}

function DetailItem({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-1 break-words text-sm font-medium text-slate-950">{value || "Not available"}</div>
    </div>
  );
}

export function JobStatus({ jobId }: { jobId: string }) {
  const [job, setJob] = useState<ProcessingJobStatusResponse | null>(null);
  const [error, setError] = useState("");
  const [isDownloadingData, setIsDownloadingData] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let pollingTimeout: number | undefined;

    async function load() {
      try {
        const response = await getProcessingJob(jobId);
        if (!cancelled) {
          setJob(response);
          setError("");

          if (response.status === "PENDING" || response.status === "RUNNING") {
            pollingTimeout = window.setTimeout(load, 60_000);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load job.");
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
      if (pollingTimeout !== undefined) {
        window.clearTimeout(pollingTimeout);
      }
    };
  }, [jobId]);

  const status = job?.status || "PENDING";
  const statusMeta = statusDisplay(status);
  const isComplete = job?.status === "SUCCESS";
  const isFailed = job?.status === "FAILED";
  const isActive = status === "PENDING" || status === "RUNNING";
  const downloadDataUrl = job?.downloadDataUrl || job?.zipFileUrl;
  const downloadDataName = job?.downloadData || job?.zipFile || "processing-data";
  const hasPolygonVectorWmsLayer = job?.vectorWmsLayers?.some((layer) =>
    layer.geoserverLayerName?.toLowerCase().startsWith("polygon_"),
  ) ?? false;

  async function handleDataDownload() {
    if (!downloadDataUrl || isDownloadingData) {
      return;
    }

    setIsDownloadingData(true);
    setError("");
    try {
      await downloadProcessingJobData(jobId, downloadDataUrl, downloadDataName);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to download data.");
    } finally {
      setIsDownloadingData(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">Processing job</p>
          <h1 className="mt-2 break-all text-2xl font-semibold text-slate-950 sm:text-3xl">Order Name : {job?.orderName}</h1>
          <p className="mt-2 text-sm text-slate-600">Dates and times are shown in UTC.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            asChild
            className="border border-teal-700 bg-teal-700 font-semibold text-white shadow-sm hover:bg-teal-800 hover:text-white focus-visible:ring-teal-600"
          >
            <Link href="/orders">
              <ArrowLeft />
              Back to orders
            </Link>
          </Button>
          {isComplete ? (
            <Button asChild className="bg-emerald-600 text-white hover:bg-emerald-700">
              <Link href={`/orders/${jobId}/map`}>
                <Database />
                View and Download Data
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      <Card>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Badge className={statusMeta.className}>{statusMeta.label}</Badge>
              {isActive ? <RefreshCw className="size-4 animate-spin text-amber-600" /> : null}
              {isComplete ? <CheckCircle2 className="size-5 text-emerald-600" /> : null}
              {isFailed ? <AlertCircle className="size-5 text-red-600" /> : null}
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <CalendarDays className="size-4" />
              Created {formatUtcDateTime(job?.createdAt)}
            </div>
          </div>

          {error ? (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {isFailed && job?.errorMessage ? (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-semibold text-red-800">Error</p>
              <p className="mt-1 text-sm text-red-700">{job.errorMessage}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <Card>
          <CardContent>
            <h2 className="text-lg font-semibold text-slate-950">Request details</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {job?.serviceType && <DetailItem label="Service Type" value={job.serviceType} />}
              {job?.serviceName && <DetailItem label="Service" value={job.serviceName} />}
              {job?.dataSource && <DetailItem label="Data Source" value={job.dataSource} />}
              {job?.temporalResolutionType && <DetailItem label="Temporal resolution" value={job.temporalResolutionType} />}
              {job?.cmip6ModelName && <DetailItem label="Model" value={job.cmip6ModelName} />}
              {job?.cmip6ScenarioName && <DetailItem label="Scenario" value={job.cmip6ScenarioName} />}
              {job?.startDate && <DetailItem label="Start date" value={formatDate(job.startDate)} />}
              {job?.endDate && <DetailItem label="End date" value={formatDate(job.endDate)} />}
              {job?.areaHa != null && <DetailItem label="Area" value={formatArea(job.areaHa)} />}
              {job?.geometryType && <DetailItem label="Geometry type" value={job.geometryType} />}
              {job?.userEmail && <DetailItem label="Email" value={job?.userEmail} />}
            </div>
          </CardContent>
        </Card>

          {hasPolygonVectorWmsLayer && job ? (
            <Card>
              <CardContent>
                <h2 className="text-lg font-semibold text-slate-950">Area of Interest</h2>
                <p className="mt-1 text-sm text-slate-600">Selected request boundary</p>
                <div className="mt-5">
                  <AoiWmsMap job={job} />
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <Card>
          <CardContent>
            <h2 className="text-lg font-semibold text-slate-950">Timeline</h2>
            <div className="mt-5 space-y-3">
              <DetailItem label="Created at" value={formatUtcDateTime(job?.createdAt)} />
              <DetailItem label="Updated at" value={formatUtcDateTime(job?.updatedAt)} />
              {isComplete ? (
                <DetailItem label="Completed at" value={formatUtcDateTime(job?.completedAt)} />
              ) : null}
            </div>

            {isComplete ? (
              <div className="mt-5 grid gap-2">
                {downloadDataUrl ? (
                  <Button
                    className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
                    disabled={isDownloadingData}
                    onClick={handleDataDownload}
                    type="button"
                  >
                    <Download />
                    {isDownloadingData ? "Downloading..." : "Download data"}
                  </Button>
                ) : null}
                <Button asChild className="w-full bg-emerald-600 text-white hover:bg-emerald-700">
                  <Link href={`/orders/${jobId}/map`}>
                  <ExternalLink />
                  View and Download Data
                  </Link>
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
