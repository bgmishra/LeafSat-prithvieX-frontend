"use client";

import type Highcharts from "highcharts";

import { getTokens } from "@/store/auth";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export type ProcessingJobCreateRequest = {
  geojson: unknown;
  startDate: string;
  endDate: string;
  serviceName: string;
  userEmail: string;
};

export type ProcessingJobCreateResponse = {
  jobId: string;
  status: "PENDING";
  message: string;
  jobToken?: string;
};


export type ProcessingJobStatusResponse = {
  jobId: string;
  status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";
  userEmail?: string;
  user?: ProcessingJobUser | null;

  // Service details
  serviceId?: number;
  serviceType?: string;
  serviceName?: string;
  serviceValue?: string;
  serviceDataSourceId?: number | null;

  // CMIP6 specific fields
  cmip6ServiceSourceId?: number | null;
  cmip6ModelName?: string | null;
  cmip6ScenarioName?: string | null;
  cmip6AtmosphericPressureLevel?: number | string | null;

  // Temporal resolution details
  temporalResolutionTypeId?: number;
  temporalResolutionType?: string;
  temporalResolutionTypeValue?: string;

  // Data source details
  dataSourceId?: number | null;
  dataSource?: string | null;
  dataSourceValue?: string | null;

  // Execution parameters
  startDate?: string;
  endDate?: string;
  areaHa?: number | null;
  geometryType?: string;
  maxRetryAttempts?: number;
  orderName?: string;
  order_name?: string;

  // Layers & Maps
  outputGeoTiff?: string;
  wmsBaseUrl?: string;
  wmsLayerName?: string;
  wmsGetMapUrl?: string;
  wcsUrl?: string;
  mapUrl?: string;
  layerBBox?: LayerBBox | null;
  layerSrs?: string | null;
  errorMessage?: string;
  outputDir?: string;
  tifLayers?: ProcessingTifLayer[];
  vectorWmsLayers?: ProcessingVectorWmsLayer[];
  chartData?: ProcessingChartData[];

  // Downloads & Exports
  zipFile?: string;
  zipFileUrl?: string;
  downloadData?: string;
  downloadDataUrl?: string;
  geojson?: unknown;
  geojsonUrl?: string;

  // Timestamps
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string | null;
};

export type ProcessingJobUser = {
  id: number;
  email: string;
  fullName: string;
};

export type LayerBBox = {
  minx?: number;
  miny?: number;
  maxx?: number;
  maxy?: number;
  minX?: number;
  minY?: number;
  maxX?: number;
  maxY?: number;
  extent?: [number, number, number, number];
  crs?: string;
};

export type ProcessingTifLayer = {
  srs?: string;
  bbox?: LayerBBox | null;
  wcsUrl?: string;
  vizType?: string;
  labelName?: string;
  workspace?: string;
  wmsBaseUrl?: string;
  tifFileName?: string;
  tifFilePath?: string;
  defaultStyle?: string;
  wmsGetMapUrl?: string;
  wmsLayerName?: string;
  geoserverLayerName?: string;
  geoserverStoreName?: string;
  useGeoServerDataPath?: string;
};

export type ProcessingVectorWmsLayer = {
  srs?: string;
  bbox?: LayerBBox | null;
  wcsUrl?: string;
  vizType?: string;
  labelName?: string;
  layerType?: string;
  storeType?: string;
  vizParams?: {
    timeData?: {
      label?: string;
      value?: number;
    }[];
    variable?: string;
    variableLabel?: string;
  }[];
  workspace?: string;
  wmsBaseUrl?: string;
  vrtFileName?: string;
  vrtFilePath?: string;
  defaultStyle?: string;
  wmsGetMapUrl?: string;
  wmsLayerName?: string;
  stagedVrtFilePath?: string;
  natural_breaks_sld?: {
    ranges?: JsonValue;
    palette_name?: string;
    reverse_palette?: boolean;
    invert_palette?: boolean;
    colors?: JsonValue;
    sld?: string;
    legend_title?: string []
  };
  geoserverLayerName?: string;
  geoserverStoreName?: string;
  publishedVrtFilePath?: string;
  timeseriesdata?:boolean
};

export type ProcessingMapLayer = ProcessingTifLayer | ProcessingVectorWmsLayer;

export type HighchartsPoint =
  | [number | string, number | null]
  | {
      name?: string;
      x?: number | string;
      y?: number | null;
    };

export type ProcessingHighchartsOptions = Omit<
  Highcharts.Options,
  "chart" | "data" | "series" | "title" | "xAxis" | "yAxis"
> & {
  chart?: Highcharts.ChartOptions;
  charttype?: "spline" | string;
  chartTitle?: string;
  data?: Record<string, HighchartsPoint[] | undefined>;
  series?: Highcharts.SeriesOptionsType[];
  title?: Highcharts.TitleOptions | string;
  xAsisTitle?: string;
  xAxisTitle?: string;
  xAxis?: Highcharts.XAxisOptions | Highcharts.XAxisOptions[];
  yAsisTitle?: string;
  yAxis?: Highcharts.YAxisOptions | Highcharts.YAxisOptions[];
  yAxisTitle?: string;
  yAxis_scale?: {
    min?: number;
    max?: number;
  };
};

export type ProcessingMultiSelectChartItem = {
  value: string | number;
  labelname: string;
  seriesdataapi?: string;
  hcData: ProcessingHighchartsOptions;
};

export type ProcessingMultiSelectChartData = {
  chartType: "multiSelect";
  data?: ProcessingMultiSelectChartItem[];
};

export type ProcessingChartData = ProcessingHighchartsOptions | ProcessingMultiSelectChartData;

export type ProcessingMapMetadata = Omit<ProcessingJobStatusResponse, "status"> & {
  status: "SUCCESS";
  wmsBaseUrl: string;
  wcsUrl?: string;
  layerName: string;
  format: "image/png";
  transparent: boolean;
  bbox: LayerBBox | null;
  srs: string | null;
  sharePreviewUrl?: string;
};

export type ProcessingJobShareResponse = {
  shareId: string;
};

export type ProcessingTimeseriesChartData = {
  min_y_value: number;
  max_y_value: number;
  y_axis_padding: number;
  series_data: HighchartsPoint[];
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_DJANGO_API_URL?.replace(/\/$/, "") ||
  `${process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "")}/api`;
const API_VERSION_PREFIX = API_BASE_URL.endsWith("/api") ? "/v1" : "";

function tokenKey(jobId: string) {
  return `processing-job-token-${jobId}`;
}

export function saveProcessingJobToken(jobId: string, token?: string) {
  if (!token || typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(tokenKey(jobId), token);
}

export function getProcessingJobToken(jobId: string) {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(tokenKey(jobId));
}

async function parseResponse(response: Response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { detail: text };
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!API_BASE_URL || API_BASE_URL.includes("undefined")) {
    throw new Error("Set NEXT_PUBLIC_DJANGO_API_URL to your Django /api URL.");
  }

  const headers = new Headers(init.headers);
  if (
    init.body &&
    !(init.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${API_VERSION_PREFIX}${path}`, {
    ...init,
    headers,
  });
  const payload = await parseResponse(response);

  if (!response.ok) {
    const detail =
      payload?.detail ||
      payload?.message ||
      Object.entries(payload || {})
        .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : value}`)
        .join("; ") ||
      `Request failed with status ${response.status}`;
    throw new Error(detail);
  }

  return payload as T;
}

function authHeadersForJob(jobId: string): HeadersInit {
  const headers = new Headers();
  const access = getTokens()?.access;
  const jobToken = getProcessingJobToken(jobId);

  if (access) {
    headers.set("Authorization", `Bearer ${access}`);
  }

  if (jobToken) {
    headers.set("X-Job-Token", jobToken);
  }

  return headers;
}

export async function createProcessingJob(payload: ProcessingJobCreateRequest) {
  const response = await request<ProcessingJobCreateResponse>("/processing/jobs/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  saveProcessingJobToken(response.jobId, response.jobToken);
  return response;
}

export function getProcessingJob(jobId: string) {
  return request<ProcessingJobStatusResponse>(`/processing/jobs/${jobId}/`, {
    headers: authHeadersForJob(jobId),
  });
}

export function getProcessingMapMetadata(jobId: string) {
  return request<ProcessingMapMetadata>(`/processing/jobs/${jobId}/map-metadata/`, {
    headers: authHeadersForJob(jobId),
  });
}

export async function getProcessingJobGeoJSON(jobId: string, geojsonUrl?: string) {
  const url =
    geojsonUrl ||
    `${API_BASE_URL}${API_VERSION_PREFIX}/apigeojson/${jobId}/`;

  const response = await fetch(url, {
    headers: authHeadersForJob(jobId),
  });
  const payload = await parseResponse(response);

  if (!response.ok) {
    const detail =
      payload?.detail ||
      payload?.message ||
      `Request failed with status ${response.status}`;
    throw new Error(detail);
  }

  return payload as unknown;
}

export function getProcessingTimeseriesChartData(jobId: string, seriesDataApi: string) {
  const seriesUrl = new URL(seriesDataApi, "http://prithiviex.local");
  const seriesPath = `${seriesUrl.pathname}${seriesUrl.search}`;
  const apiPath =
    API_VERSION_PREFIX && seriesPath.startsWith(API_VERSION_PREFIX)
      ? seriesPath.slice(API_VERSION_PREFIX.length)
      : seriesPath.replace(/^\/api\/v1/, "");

  return request<ProcessingTimeseriesChartData>(apiPath, {
    headers: authHeadersForJob(jobId),
  });
}

export function createProcessingJobShare(jobId: string) {
  return request<ProcessingJobShareResponse>(`/processing/jobs/${jobId}/share/`, {
    method: "POST",
    headers: authHeadersForJob(jobId),
  });
}

export function uploadProcessingJobSharePreview(jobId: string, preview: Blob) {
  const body = new FormData();
  body.append("preview", preview, "share-preview.png");

  return request<{ shareId: string; previewUrl: string }>(
    `/processing/jobs/${jobId}/share-preview/`,
    {
      method: "POST",
      headers: authHeadersForJob(jobId),
      body,
    }
  );
}

export function getSharedProcessingMapMetadata(shareId: string) {
  return request<ProcessingMapMetadata>(
    `/processing/shared/${shareId}/map-metadata/`
  );
}

function filenameFromContentDisposition(value: string | null) {
  if (!value) {
    return "";
  }

  const utf8Match = value.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const filenameMatch = value.match(/filename="?([^";]+)"?/i);
  return filenameMatch?.[1] || "";
}

export async function downloadProcessingJobZip(
  jobId: string,
  zipFileUrl?: string,
  fallbackFilename = "LandAnalysis.zip"
) {
  const url =
    zipFileUrl ||
    `${API_BASE_URL}${API_VERSION_PREFIX}/processing/jobs/${jobId}/download-zip/`;

  const response = await fetch(url, {
    headers: authHeadersForJob(jobId),
  });

  if (!response.ok) {
    const payload = await parseResponse(response);
    const detail =
      payload?.detail ||
      payload?.message ||
      `Download failed with status ${response.status}`;
    throw new Error(detail);
  }

  const blob = await response.blob();
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download =
    filenameFromContentDisposition(response.headers.get("Content-Disposition")) ||
    fallbackFilename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(objectUrl);
}

export async function downloadProcessingJobData(
  jobId: string,
  downloadDataUrl?: string,
  fallbackFilename = "processing-data"
) {
  const url =
    downloadDataUrl ||
    `${API_BASE_URL}${API_VERSION_PREFIX}/processing/jobs/${jobId}/download-data/`;

  const response = await fetch(url, {
    headers: authHeadersForJob(jobId),
  });

  if (!response.ok) {
    const payload = await parseResponse(response);
    const detail =
      payload?.detail ||
      payload?.message ||
      `Download failed with status ${response.status}`;
    throw new Error(detail);
  }

  const blob = await response.blob();
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download =
    filenameFromContentDisposition(response.headers.get("Content-Disposition")) ||
    fallbackFilename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(objectUrl);
}
