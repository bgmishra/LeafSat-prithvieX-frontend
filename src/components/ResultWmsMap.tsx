"use client";

import "ol/ol.css";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Download, Layers3 } from "lucide-react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import Map from "ol/Map";
import Overlay from "ol/Overlay";
import OverlayPositioning from "ol/OverlayPositioning";
import FullScreen from "ol/control/FullScreen";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import ImageLayer from 'ol/layer/Image.js';
import ImageWMS from 'ol/source/ImageWMS.js';

import OSM from "ol/source/OSM";
import { fromLonLat } from "ol/proj";


import {
  downloadProcessingJobData,
  createProcessingJobShare,
  getProcessingMapMetadata,
  getSharedProcessingMapMetadata,
  getProcessingTimeseriesChartData,
  uploadProcessingJobSharePreview,
  type HighchartsPoint,
  type ProcessingChartData,
  type ProcessingHighchartsOptions,
  type ProcessingMultiSelectChartData,
  type ProcessingTimeseriesChartData,
  type ProcessingMapLayer,
  type ProcessingMapMetadata,
} from "@/lib/api";
import { useAuth } from "@/store/auth-provider";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectOption } from "@/components/ui/select";
import XYZSource from "ol/source/XYZ";
import LayerSwitcherImage from "ol-ext/control/LayerSwitcherImage.js";

import LayerSwitcher from "ol-plus/ui/LayerSwitcher.js";
import TimeDimensionTile from "ol-plus/layer/TimeDimensionTile.js";

const DEFAULT_CHART_TYPE = "spline";
const SOCIAL_PREVIEW_WIDTH = 1200;
const SOCIAL_PREVIEW_HEIGHT = 627;
const SOCIAL_PREVIEW_HEADER_HEIGHT = 108;
const SOCIAL_PREVIEW_MAP_WIDTH = Math.round(SOCIAL_PREVIEW_WIDTH * 0.51);
const SOCIAL_PREVIEW_CONTENT_HEIGHT =
  SOCIAL_PREVIEW_HEIGHT - SOCIAL_PREVIEW_HEADER_HEIGHT;

type SharePlatform = "facebook" | "linkedin" | "x";

type FeatureInfoPopup = {
  title: string;
  name: string;
  date: string;
  value: string;
  unit: string;
};

const SHARE_PLATFORM_LABELS: Record<SharePlatform, string> = {
  facebook: "Facebook",
  linkedin: "LinkedIn",
  x: "X",
};

function FacebookIcon({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.413c0-3.026 1.792-4.697 4.533-4.697 1.313 0 2.686.236 2.686.236v2.974h-1.513c-1.49 0-1.956.931-1.956 1.887v2.26h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073Z" />
    </svg>
  );
}

function LinkedInIcon({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.452 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.94v5.666H9.356V8.997h3.414v1.565h.048c.475-.9 1.636-1.85 3.367-1.85 3.6 0 4.267 2.37 4.267 5.455v6.285ZM5.345 7.433a2.062 2.062 0 1 1 0-4.123 2.062 2.062 0 0 1 0 4.123ZM7.122 20.452H3.568V8.997h3.554v11.455ZM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003Z" />
    </svg>
  );
}

function XIcon({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </svg>
  );
}

function canvasToPngBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    try {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Unable to create the share preview image."));
        }
      }, "image/png");
    } catch {
      reject(
        new Error(
          "The map preview could not be exported. Check GeoServer and basemap CORS settings."
        )
      );
    }
  });
}

function highchartsSvgToImage(svg: SVGSVGElement) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const bounds = svg.getBoundingClientRect();
    clone.setAttribute("width", String(Math.max(1, Math.round(bounds.width))));
    clone.setAttribute("height", String(Math.max(1, Math.round(bounds.height))));
    const source = new XMLSerializer().serializeToString(clone);
    const objectUrl = URL.createObjectURL(
      new Blob([source], { type: "image/svg+xml;charset=utf-8" })
    );
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Unable to render the Highcharts preview."));
    };
    image.src = objectUrl;
  });
}

async function captureHighchartsImage(width: number, height: number) {
  const currentSvg = document.querySelector<SVGSVGElement>(".highcharts-container svg");
  if (!currentSvg) {
    return null;
  }

  const chart = Highcharts.charts.find(
    (candidate) => candidate && candidate.container.contains(currentSvg)
  );
  if (!chart) {
    return highchartsSvgToImage(currentSvg);
  }

  const originalWidth = chart.chartWidth;
  const originalHeight = chart.chartHeight;
  try {
    chart.setSize(width, height, false);
    const resizedSvg = chart.container.querySelector<SVGSVGElement>("svg");
    return resizedSvg ? await highchartsSvgToImage(resizedSvg) : null;
  } finally {
    chart.setSize(originalWidth, originalHeight, false);
  }
}

function drawImageCover(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  targetX: number,
  targetY: number,
  targetWidth: number,
  targetHeight: number
) {
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = targetWidth / targetHeight;
  let sourceX = 0;
  let sourceY = 0;
  let cropWidth = sourceWidth;
  let cropHeight = sourceHeight;

  if (sourceRatio > targetRatio) {
    cropWidth = sourceHeight * targetRatio;
    sourceX = (sourceWidth - cropWidth) / 2;
  } else {
    cropHeight = sourceWidth / targetRatio;
    sourceY = (sourceHeight - cropHeight) / 2;
  }

  context.drawImage(
    image,
    sourceX,
    sourceY,
    cropWidth,
    cropHeight,
    targetX,
    targetY,
    targetWidth,
    targetHeight
  );
}

function fitCardTitle(context: CanvasRenderingContext2D, title: string, maxWidth: number) {
  if (context.measureText(title).width <= maxWidth) {
    return title;
  }

  let shortened = title;
  while (shortened.length && context.measureText(`${shortened}…`).width > maxWidth) {
    shortened = shortened.slice(0, -1);
  }
  return `${shortened}…`;
}

async function captureMapAtPreviewSize(
  map: Map,
  extent: [number, number, number, number] | undefined
) {
  const target = map.getTargetElement();
  const originalWidth = target.style.width;
  const originalHeight = target.style.height;

  target.style.width = `${SOCIAL_PREVIEW_MAP_WIDTH}px`;
  target.style.height = `${SOCIAL_PREVIEW_CONTENT_HEIGHT}px`;

  try {
    map.updateSize();
    const size = map.getSize();
    if (!size?.[0] || !size[1]) {
      throw new Error("Unable to prepare the map at the social-preview size.");
    }

    if (extent?.length === 4 && extent.every(Number.isFinite)) {
      map.getView().fit(extent, {
        size,
        padding: [24, 24, 24, 24],
        duration: 0,
      });
    }

    await new Promise<void>((resolve, reject) => {
      const onRenderComplete = () => {
        window.clearTimeout(timeout);
        resolve();
      };
      const timeout = window.setTimeout(() => {
        map.un("rendercomplete", onRenderComplete);
        reject(new Error("The map preview took too long to render. Please try again."));
      }, 10000);

      map.once("rendercomplete", onRenderComplete);
      map.renderSync();
    });

    const mapCanvas = document.createElement("canvas");
    mapCanvas.width = size[0];
    mapCanvas.height = size[1];
    const mapContext = mapCanvas.getContext("2d");
    if (!mapContext) {
      throw new Error("Canvas export is not supported by this browser.");
    }

    const layerCanvases = map.getViewport().querySelectorAll<HTMLCanvasElement>(
      ".ol-layer canvas, canvas.ol-layer"
    );
    layerCanvases.forEach((canvas) => {
      if (!canvas.width || !canvas.height) {
        return;
      }

      const parent = canvas.parentElement;
      mapContext.globalAlpha = Number(parent ? getComputedStyle(parent).opacity : 1) || 1;
      const background = parent ? getComputedStyle(parent).backgroundColor : "";
      if (background && background !== "rgba(0, 0, 0, 0)") {
        mapContext.fillStyle = background;
        mapContext.fillRect(0, 0, mapCanvas.width, mapCanvas.height);
      }

      const matrix = canvas.style.transform
        .match(/^matrix\(([^)]+)\)$/)?.[1]
        .split(",")
        .map(Number);
      if (matrix?.length === 6 && matrix.every(Number.isFinite)) {
        mapContext.setTransform(matrix[0], matrix[1], matrix[2], matrix[3], matrix[4], matrix[5]);
      } else {
        mapContext.setTransform(
          mapCanvas.width / canvas.width,
          0,
          0,
          mapCanvas.height / canvas.height,
          0,
          0
        );
      }
      mapContext.drawImage(canvas, 0, 0);
    });
    mapContext.setTransform(1, 0, 0, 1, 0, 0);
    mapContext.globalAlpha = 1;
    return mapCanvas;
  } finally {
    target.style.width = originalWidth;
    target.style.height = originalHeight;
    map.updateSize();
    const restoredSize = map.getSize();
    if (extent?.length === 4 && extent.every(Number.isFinite) && restoredSize) {
      map.getView().fit(extent, {
        size: restoredSize,
        padding: [24, 24, 24, 24],
        duration: 0,
      });
    }
    map.renderSync();
  }
}

async function waitForPreviewImage(previewUrl: string) {
  const attempts = 6;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      await new Promise<void>((resolve, reject) => {
        const image = new Image();
        const timeout = window.setTimeout(() => {
          image.src = "";
          reject(new Error("Preview image request timed out."));
        }, 5000);

        image.onload = () => {
          window.clearTimeout(timeout);
          resolve();
        };
        image.onerror = () => {
          window.clearTimeout(timeout);
          reject(new Error("Preview image is not available yet."));
        };
        const separator = previewUrl.includes("?") ? "&" : "?";
        image.src = `${previewUrl}${separator}ready=${Date.now()}`;
      });
      return;
    } catch {
      if (attempt === attempts - 1) {
        break;
      }
      await new Promise((resolve) => window.setTimeout(resolve, 750));
    }
  }

  throw new Error(
    "The share preview was uploaded but is not publicly available yet. Please try again shortly."
  );
}

type TimeDimensionEntry = {
  WMSURL: string;
  dateisoFormat: string;
  dateisoFormatForLevel?: string;
  layerid: string;
  localDateTime?: string;
  visibility: boolean;
  cqlFilter: string;
};

function titleFromKey(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function toHighchartsTimestamp(timestamp: number) {
  // The processing API currently returns Unix epoch seconds (for example
  // 1735689600). Highcharts datetime axes require epoch milliseconds.
  // Keep already-millisecond timestamps unchanged for backwards compatibility.
  return Math.abs(timestamp) < 100_000_000_000 ? timestamp * 1000 : timestamp;
}

function normalizeTimeseriesPoints(points: HighchartsPoint[]): HighchartsPoint[] {
  return points.map((point) => {
    if (Array.isArray(point) && typeof point[0] === "number") {
      return [toHighchartsTimestamp(point[0]), ...point.slice(1)] as HighchartsPoint;
    }
    if (!Array.isArray(point) && typeof point.x === "number") {
      return { ...point, x: toHighchartsTimestamp(point.x) } as HighchartsPoint;
    }
    return point;
  });
}

function isDatetimeSeries(points: HighchartsPoint[]) {
  const firstPoint = points.find((point) => {
    if (Array.isArray(point)) {
      return point[0] != null;
    }
    return point.x != null;
  });
  const xValue = Array.isArray(firstPoint) ? firstPoint?.[0] : firstPoint?.x;

  return typeof xValue === "number" && xValue > 100000000000;
}

function isMultiSelectChart(chart: ProcessingChartData): chart is ProcessingMultiSelectChartData {
  return "chartType" in chart && chart.chartType === "multiSelect";
}

function hasLegacySeriesData(chart: ProcessingHighchartsOptions) {
  return Boolean(chart.data && !Array.isArray(chart.data) && Object.keys(chart.data).length > 0);
}

function chartKey(chart: ProcessingHighchartsOptions, index: number) {
  return `${
    chart.chartTitle ||
    (typeof chart.title === "string" ? chart.title : chart.title?.text) ||
    "chart"
  }-${index}`;
}

function buildWmsPostBody(params: Record<string, string | number | boolean>, encodedSLD?: string) {
  const body = new URLSearchParams();
  const encodedParts: string[] = [];

  Object.entries(params).forEach(([key, value]) => {
    if (key === "LEGEND_OPTIONS") {
      encodedParts.push(`${key}=${value}`);
      return;
    }
    body.set(key, String(value));
  });

  if (encodedSLD) {
    encodedParts.push(`SLD_BODY=${encodedSLD}`);
  }

  return [body.toString(), ...encodedParts].filter(Boolean).join("&");
}

async function addTitleTextToImageBlob(blob: Blob, titleLines: string[]) {
  const imageUrl = URL.createObjectURL(blob);
  const image = new Image();

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Unable to load legend image."));
      image.src = imageUrl;
    });

    type TitleTextRun = {
      text: string;
      bold: boolean;
      italic: boolean;
      verticalAlign: "normal" | "sup" | "sub";
    };

    const parseTitleLine = (html: string): TitleTextRun[] => {
      const template = document.createElement("template");
      template.innerHTML = html;
      const runs: TitleTextRun[] = [];

      const visit = (
        node: Node,
        style: Omit<TitleTextRun, "text">
      ) => {
        if (node.nodeType === Node.TEXT_NODE) {
          if (node.textContent) {
            runs.push({ text: node.textContent, ...style });
          }
          return;
        }

        if (!(node instanceof HTMLElement)) {
          return;
        }

        const tagName = node.tagName.toLowerCase();
        const childStyle = {
          bold: style.bold || tagName === "b" || tagName === "strong",
          italic: style.italic || tagName === "i" || tagName === "em",
          verticalAlign:
            tagName === "sup"
              ? ("sup" as const)
              : tagName === "sub"
                ? ("sub" as const)
                : style.verticalAlign,
        };

        node.childNodes.forEach((child) => visit(child, childStyle));
      };

      template.content.childNodes.forEach((node) =>
        visit(node, { bold: true, italic: false, verticalAlign: "normal" })
      );

      return runs;
    };

    const padding = 8;
    const lineHeight = 18;
    const titleRuns = titleLines.map(parseTitleLine);
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      return imageUrl;
    }

    const setRunFont = (run: TitleTextRun) => {
      const fontSize = run.verticalAlign === "normal" ? 14 : 10;
      context.font = `${run.italic ? "italic " : ""}${run.bold ? "bold " : ""}${fontSize}px Arial`;
    };
    const measureRuns = (runs: TitleTextRun[]) =>
      runs.reduce((width, run) => {
        setRunFont(run);
        return width + context.measureText(run.text).width;
      }, 0);

    const textWidth = Math.max(
      ...titleRuns.map(measureRuns),
      0
    );

    canvas.width = Math.ceil(Math.max(image.width, textWidth + padding * 2));
    const titleHeight = titleLines.length * lineHeight + padding;
    canvas.height = titleHeight + image.height + padding;

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = "#111111";
    context.textAlign = "left";
    context.textBaseline = "alphabetic";
    titleRuns.forEach((runs, index) => {
      let x = (canvas.width - measureRuns(runs)) / 2;
      const baseline = padding + index * lineHeight + 14;

      runs.forEach((run) => {
        setRunFont(run);
        const y =
          baseline +
          (run.verticalAlign === "sup"
            ? -6
            : run.verticalAlign === "sub"
              ? 3
              : 0);
        context.fillText(run.text, x, y);
        x += context.measureText(run.text).width;
      });
    });
    context.drawImage(image, Math.floor((canvas.width - image.width) / 2), titleHeight);

    return await new Promise<string>((resolve) => {
      canvas.toBlob((canvasBlob) => {
        if (!canvasBlob) {
          resolve(imageUrl);
          return;
        }

        URL.revokeObjectURL(imageUrl);
        resolve(URL.createObjectURL(canvasBlob));
      }, "image/png");
    });
  } catch {
    return imageUrl;
  }
}

async function fetchWmsObjectUrl(
  url: string,
  params: Record<string, string | number | boolean>,
  encodedSLD?: string,
  titleLines?: string[]
) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: buildWmsPostBody(params, encodedSLD),
  });

  const blob = await response.blob();
  if (titleLines?.length) {
    return addTitleTextToImageBlob(blob, titleLines);
  }

  return URL.createObjectURL(blob);
}

function ProcessingChart({ chart }: { chart: ProcessingHighchartsOptions }) {
  const {
    charttype,
    chartTitle,
    data,
    series: backendSeries,
    title,
    xAsisTitle,
    xAxisTitle,
    yAsisTitle,
    yAxisTitle,
    yAxis_scale,
    ...backendOptions
  } = chart;
  const chartType = backendOptions.chart?.type || charttype || DEFAULT_CHART_TYPE;
  const fallbackSeries = Object.entries(data || {})
    .filter(([, data]) => Array.isArray(data) && data.length > 0)
    .map(([name, data]) => ({
      data,
      name: titleFromKey(name),
      type: chartType,
    })) as Highcharts.SeriesOptionsType[];
  const series = backendSeries?.length ? backendSeries : fallbackSeries;
  const firstSeriesData = Object.values(data || {}).find(
    (data): data is HighchartsPoint[] => Array.isArray(data) && data.length > 0
  );
  const backendTitle = typeof title === "string" ? { text: title } : title;
  const yAxisMin = yAxis_scale?.min ?? undefined;
  const yAxisMax = yAxis_scale?.max ?? undefined;

  if (!series.length) {
    return (
      <div className="flex h-80 items-center justify-center text-sm font-medium text-slate-500 sm:h-96">
        No chart data available.
      </div>
    );
  }

  const options: Highcharts.Options = {
    ...backendOptions,
    chart: {
      height: 420,
      type: chartType,
      zooming: {
        type: "x",
      },
      ...backendOptions.chart,
    },
    credits: {
      enabled: false,
      ...backendOptions.credits,
    },
    legend: {
      backgroundColor: "rgba(255,255,255,0.8)",
      ...backendOptions.legend,
    },
    plotOptions: {
      scatter: {
        marker: {
          enabled: true,
          radius: 3,
          symbol: "circle",
        },
        ...backendOptions.plotOptions?.scatter,
      },
      series: {
        marker: {
          enabled: false,
        },
        ...backendOptions.plotOptions?.series,
      },
      ...backendOptions.plotOptions,
    },
    series,
    title: {
      useHTML: true,
      text: chartTitle || backendTitle?.text || "Processing Chart",
      ...backendTitle,
    },
    tooltip: {
      shared: true,
      valueDecimals: 3,
      xDateFormat: "%Y-%m-%d",
      ...backendOptions.tooltip,
    },
    xAxis: backendOptions.xAxis || {
      gridLineWidth: 1,
      title: {
        text: xAsisTitle || xAxisTitle || "X Axis",
      },
      type: firstSeriesData && isDatetimeSeries(firstSeriesData) ? "datetime" : undefined,
    },
    yAxis: backendOptions.yAxis || {
      gridLineDashStyle: "Dash",
      max: yAxisMax,
      min: yAxisMin,
      title: {
        useHTML: true,
        text: yAsisTitle || yAxisTitle || "Y Axis",
      },
    },
  };

  return <HighchartsReact highcharts={Highcharts} options={options} />;
}

function mergeTimeseriesData(
  chart: ProcessingHighchartsOptions,
  timeseriesData: ProcessingTimeseriesChartData
): ProcessingHighchartsOptions {
  const normalizedSeriesData = normalizeTimeseriesPoints(timeseriesData.series_data);
  const nextSeries =
    chart.series?.length
      ? (chart.series.map((series, index) =>
          index === 0
            ? ({ ...series, data: normalizedSeriesData } as Highcharts.SeriesOptionsType)
            : series
        ) as Highcharts.SeriesOptionsType[])
      : [
          {
            data: normalizedSeriesData,
            name: typeof chart.title === "string" ? chart.title : chart.title?.text || "Value",
            type: chart.chart?.type || DEFAULT_CHART_TYPE,
          } as Highcharts.SeriesOptionsType,
        ];
  const yAxisMin = Number(
    (timeseriesData.min_y_value - timeseriesData.y_axis_padding).toFixed(4)
  );
  const yAxisMax = Number(
    (timeseriesData.max_y_value + timeseriesData.y_axis_padding).toFixed(4)
  );
  const nextYAxis = Array.isArray(chart.yAxis)
    ? chart.yAxis.map((axis, index) =>
        index === 0 ? { ...axis, min: yAxisMin, max: yAxisMax } : axis
      )
    : {
        ...(chart.yAxis || {}),
        min: yAxisMin,
        max: yAxisMax,
      };

  return {
    ...chart,
    series: nextSeries,
    yAxis: nextYAxis,
  };
}

function MultiSelectProcessingChart({
  chart,
  jobId,
}: {
  chart: ProcessingMultiSelectChartData;
  jobId?: string;
}) {
  const options = useMemo(() => chart.data?.filter((item) => item.hcData) || [], [chart.data]);
  const [selectedValue, setSelectedValue] = useState(() =>
    options[0]?.value != null ? String(options[0].value) : ""
  );
  const [loadedSeries, setLoadedSeries] = useState<Record<string, ProcessingTimeseriesChartData>>(
    {}
  );
  const [loadingSeriesKey, setLoadingSeriesKey] = useState("");
  const [seriesError, setSeriesError] = useState("");
  const activeValue = options.some((item) => String(item.value) === selectedValue)
    ? selectedValue
    : options[0]?.value != null
      ? String(options[0].value)
      : "";
  const selectedItem =
    options.find((item) => String(item.value) === activeValue) || options[0] || null;
  const selectedSeriesKey = selectedItem?.seriesdataapi || "";
  const selectedTimeseriesData = selectedSeriesKey ? loadedSeries[selectedSeriesKey] : null;
  const selectedChart =
    selectedItem && selectedTimeseriesData
      ? mergeTimeseriesData(selectedItem.hcData, selectedTimeseriesData)
      : selectedItem?.hcData;

  useEffect(() => {
    if (!selectedItem?.seriesdataapi || !jobId || loadedSeries[selectedItem.seriesdataapi]) {
      return;
    }

    let cancelled = false;
    const seriesKey = selectedItem.seriesdataapi;
    const requestJobId = jobId;

    async function loadSeriesData() {
      await Promise.resolve();
      if (cancelled) {
        return;
      }

      setLoadingSeriesKey(seriesKey);
      setSeriesError("");

      try {
        const response = await getProcessingTimeseriesChartData(requestJobId, seriesKey);
        if (!cancelled) {
          setLoadedSeries((current) => ({ ...current, [seriesKey]: response }));
        }
      } catch (err) {
        if (!cancelled) {
          setSeriesError(err instanceof Error ? err.message : "Unable to load chart data.");
        }
      } finally {
        if (!cancelled) {
          setLoadingSeriesKey((current) => (current === seriesKey ? "" : current));
        }
      }
    }

    void loadSeriesData();
    return () => {
      cancelled = true;
    };
  }, [jobId, loadedSeries, selectedItem]);

  if (!selectedItem) {
    return (
      <div className="flex h-80 items-center justify-center text-sm font-medium text-slate-500 sm:h-96">
        No chart data available.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="w-full max-w-xs">
        <Select
          aria-label="Select polygon"
          value={activeValue}
          onChange={(event) => setSelectedValue(event.target.value)}
        >
          {options.map((item) => (
            <SelectOption key={String(item.value)} value={String(item.value)}>
              {item.labelname}
            </SelectOption>
          ))}
        </Select>
      </div>
      {loadingSeriesKey === selectedSeriesKey ? (
        <div className="flex h-80 items-center justify-center text-sm font-medium text-slate-500 sm:h-96">
          Loading chart data...
        </div>
      ) : seriesError && !selectedTimeseriesData ? (
        <div className="flex h-80 items-center justify-center text-center text-sm font-medium text-red-600 sm:h-96">
          {seriesError}
        </div>
      ) : selectedChart ? (
        <ProcessingChart chart={selectedChart} />
      ) : (
        <div className="flex h-80 items-center justify-center text-sm font-medium text-slate-500 sm:h-96">
          No chart data available.
        </div>
      )}
    </div>
  );
}

function ProcessingCharts({
  chartData,
  jobId,
}: {
  chartData?: ProcessingChartData[];
  jobId?: string;
}) {
  const charts =
    chartData?.filter(
      (chart) =>
        (isMultiSelectChart(chart) && Boolean(chart.data?.length)) ||
        (!isMultiSelectChart(chart) && (Boolean(chart.series?.length) || hasLegacySeriesData(chart)))
    ) || [];

  if (!charts.length) {
    return (
      <div className="flex h-80 items-center justify-center text-sm font-medium text-slate-500 sm:h-96">
        No chart data available.
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {charts.map((chart, index) => (
        <div key={isMultiSelectChart(chart) ? `multi-select-chart-${index}` : chartKey(chart, index)}>
          {isMultiSelectChart(chart) ? (
            <MultiSelectProcessingChart chart={chart} jobId={jobId} />
          ) : (
            <ProcessingChart chart={chart} />
          )}
        </div>
      ))}
    </div>
  );
}

export function ResultWmsMap({
  jobId,
  shareId,
  embedded = false,
}: {
  jobId?: string;
  shareId?: string;
  embedded?: boolean;
}) {
  const { isAuthenticated } = useAuth();
  const mapElement = useRef<HTMLDivElement | null>(null);
  const popupElement = useRef<HTMLDivElement | null>(null);
  const popupOverlay = useRef<Overlay | null>(null);
  const mapRef = useRef<Map | null>(null);
  const metadataRef = useRef<ProcessingMapMetadata | null>(null);
  const [metadata, setMetadata] = useState<ProcessingMapMetadata | null>(null);
  const [featureInfoPopup, setFeatureInfoPopup] = useState<FeatureInfoPopup | null>(null);
  const [error, setError] = useState("");
  const [isDownloadingData, setIsDownloadingData] = useState(false);
  const [sharingPlatform, setSharingPlatform] = useState<SharePlatform | null>(null);
  const [shareTargetUrl, setShareTargetUrl] = useState("");
  const [shareError, setShareError] = useState("");
  const [selectedLayerIndex, setSelectedLayerIndex] = useState(0);

  const tifLayers = useMemo(() => metadata?.tifLayers || [], [metadata?.tifLayers]);
  const vectorWmsLayers = useMemo(
    () => metadata?.vectorWmsLayers || [],
    [metadata?.vectorWmsLayers]
  );
  const layers: ProcessingMapLayer[] = useMemo(
    () => [...tifLayers, ...vectorWmsLayers],
    [tifLayers, vectorWmsLayers]
  );
  const selectedLayer = layers[selectedLayerIndex] || null;
  const downloadDataUrl = metadata?.downloadDataUrl || metadata?.zipFileUrl;
  const downloadDataName = metadata?.downloadData || metadata?.zipFile || "processing-data";
  const selectedLayerDownloadUrl =
    selectedLayer?.wcsUrl ||
    metadata?.wcsUrl ||
    metadata?.tifLayers?.[0]?.wcsUrl ||
    metadata?.vectorWmsLayers?.[0]?.wcsUrl;
  const orderName = metadata?.orderName || metadata?.order_name;

  useEffect(() => {
    metadataRef.current = metadata;
  }, [metadata]);

  function closeFeatureInfoPopup() {
    popupOverlay.current?.setPosition(undefined);
    setFeatureInfoPopup(null);
  }

  async function handleDataDownload() {
    if (!downloadDataUrl || isDownloadingData) {
      return;
    }

    setIsDownloadingData(true);
    setError("");
    try {
      await downloadProcessingJobData(jobId || shareId || "", downloadDataUrl, downloadDataName);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to download data.");
    } finally {
      setIsDownloadingData(false);
    }
  }

  async function createSocialPreview() {
    const map = mapRef.current;
    if (!map || !metadata) {
      throw new Error("Wait for the result map to finish loading before sharing.");
    }

    const previewExtent = metadata.bbox?.extent;
    const mapCanvas = await captureMapAtPreviewSize(map, previewExtent);

    const card = document.createElement("canvas");
    card.width = SOCIAL_PREVIEW_WIDTH;
    card.height = SOCIAL_PREVIEW_HEIGHT;
    const context = card.getContext("2d");
    if (!context) {
      throw new Error("Canvas export is not supported by this browser.");
    }

    const headerHeight = SOCIAL_PREVIEW_HEADER_HEIGHT;
    context.fillStyle = "#0f172a";
    context.fillRect(0, 0, card.width, card.height);
    context.fillStyle = "#2dd4bf";
    context.fillRect(0, headerHeight - 5, card.width, 5);
    context.fillStyle = "#ffffff";
    context.font = "700 34px Arial, sans-serif";
    context.fillText("PrithivieX", 42, 48);
    context.font = "600 25px Arial, sans-serif";
    context.fillStyle = "#cbd5e1";
    const cardTitle = orderName || metadata.serviceName || "Geospatial analysis result";
    context.fillText(fitCardTitle(context, cardTitle, 850), 42, 85);
    context.font = "500 20px Arial, sans-serif";
    context.textAlign = "right";
    context.fillStyle = "#99f6e4";
    context.fillText("Shared analysis result", card.width - 42, 62);
    context.textAlign = "left";

    const contentY = headerHeight;
    const contentHeight = card.height - contentY;
    const mapWidth = SOCIAL_PREVIEW_MAP_WIDTH;
    const chartPadding = 10;
    const chartWidth = card.width - mapWidth - chartPadding * 2;
    const chartHeight = contentHeight - chartPadding * 2;
    const chartImage = await captureHighchartsImage(chartWidth, chartHeight);
    if (chartImage) {
      const chartX = mapWidth;

      drawImageCover(
        context,
        mapCanvas,
        mapCanvas.width,
        mapCanvas.height,
        0,
        contentY,
        mapWidth,
        contentHeight
      );
      context.fillStyle = "#ffffff";
      context.fillRect(chartX, contentY, card.width - chartX, contentHeight);
      context.fillStyle = "#e2e8f0";
      context.fillRect(chartX, contentY, 2, contentHeight);
      context.drawImage(
        chartImage,
        chartX + chartPadding,
        contentY + chartPadding,
        chartWidth,
        chartHeight
      );
    } else {
      drawImageCover(
        context,
        mapCanvas,
        mapCanvas.width,
        mapCanvas.height,
        0,
        contentY,
        card.width,
        contentHeight
      );
    }

    return canvasToPngBlob(card);
  }

  async function handleShare(platform: SharePlatform) {
    if (!jobId) {
      return;
    }

    setSharingPlatform(platform);
    setShareTargetUrl("");
    setShareError("");
    setError("");
    try {
      const { shareId: createdShareId } = await createProcessingJobShare(jobId);
      const preview = await createSocialPreview();
      const { previewUrl } = await uploadProcessingJobSharePreview(jobId, preview);
      await waitForPreviewImage(previewUrl);
      const previewFilename = new URL(previewUrl).pathname.split("/").pop();
      const previewVersion = encodeURIComponent(previewFilename || Date.now().toString());
      const resultUrl = `${window.location.origin}/shared/${createdShareId}?preview=${previewVersion}`;
      const encodedUrl = encodeURIComponent(resultUrl);
      const encodedText = encodeURIComponent(
        `View ${orderName || metadata?.serviceName || "this analysis result"} on PrithivieX`
      );
      const platformUrl = {
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
        x: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
      }[platform];
      setShareTargetUrl(platformUrl);
    } catch (err) {
      setShareError(err instanceof Error ? err.message : "Unable to create the share link.");
    }
  }

  function closeShareDialog() {
    setSharingPlatform(null);
    setShareTargetUrl("");
    setShareError("");
  }

  function openSocialShare() {
    if (!shareTargetUrl) {
      return;
    }
    window.open(shareTargetUrl, "_blank", "noopener,noreferrer");
    closeShareDialog();
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = shareId
          ? await getSharedProcessingMapMetadata(shareId)
          : await getProcessingMapMetadata(jobId || "");
        if (!cancelled) {
          setMetadata(response);
          setSelectedLayerIndex(0);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load map metadata.");
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [jobId, shareId]);


  useEffect(() => {
  console.log("Component mounted");


    if (!mapElement.current || mapRef.current) {
      return;
    }

    // const satelliteLayer = new Geoportail({
    //   title: 'Satellite Imaginary',
    //   baseLayer: true,
    //   displayInLayerSwitcher: true,
    //   visible: false,
    //   layer: 'ORTHOIMAGERY.ORTHOPHOTOS',
    //   opacity: 1
    // })

    // const satelliteLayer2 =new TileLayer({
    //   title: 'Google Satellite Imaginary',
    //   baseLayer: true,
    //   displayInLayerSwitcher: true,
    //   visible: false,
    //   source: new XYZSource({
    //     // Google's satellite tile server URL
    //     url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    //     maxZoom: 20
    //   })
    // });

    const satelliteLayer3 =new TileLayer({
      visible: false,
      source: new XYZSource({
        crossOrigin: "anonymous",
        // Pure satellite imagery url
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        // Crucial: You must attribute the data providers
        attributions: 'Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxZoom: 19
      })
    });

    satelliteLayer3.setProperties({
      baseLayer: true,
      displayInLayerSwitcher: true,
      title: "Satellite Imaginary",
    });

    const osm = new TileLayer({
      opacity: 1,
      source: new OSM({ crossOrigin: "anonymous" }),
      visible: true
    });
    osm.setProperties({
      baseLayer: true,
      displayInLayerSwitcher: true,
      title: "OSM",
    });

    const openTopomap = new TileLayer({
      source: new XYZSource({
        crossOrigin: "anonymous",
        url: 'https://{a-c}.tile.opentopomap.org/{z}/{x}/{y}.png',
      }),
      visible: false,
      opacity: 1,
    });
    openTopomap.setProperties({
      baseLayer: true,
      displayInLayerSwitcher: true,
      title: "Open Topo Map",
    });
    mapRef.current = new Map({
      target: mapElement.current,
      layers: [
      //  satelliteLayer,
      // satelliteLayer2,
      satelliteLayer3,
       osm,
       openTopomap
      ],
      view: new View({
        center: fromLonLat([84.124, 28.3949]),
        zoom: 6.6,
      }),
    });

    if (popupElement.current) {
      popupOverlay.current = new Overlay({
        element: popupElement.current,
        positioning: OverlayPositioning.BOTTOM_CENTER,
        offset: [0, -12],
        stopEvent: true,
      });
      mapRef.current.addOverlay(popupOverlay.current);
    }

    const resizeObserver = new ResizeObserver(() => {
      mapRef.current?.updateSize();
    });
    resizeObserver.observe(mapElement.current);

    const ctrl = new LayerSwitcherImage({collapsed: false});
    ctrl.isOpen(true);
    mapRef.current.addControl(ctrl);
    const fullScreenControl = new FullScreen({
      tipLabel: "Toggle full screen",
    });
    mapRef.current.addControl(fullScreenControl);
    



mapRef.current.on('singleclick', async (evt) => {
  const map = mapRef.current;
  if (!map) return;

  closeFeatureInfoPopup();

  const layers: ImageLayer[] = [];

  map.forEachLayerAtPixel(evt.pixel, (layer) => {
    if (
      layer instanceof ImageLayer &&
      layer.getSource() instanceof ImageWMS
    ) {
      layers.push(layer as ImageLayer);
    }
  });

  const layer = layers.find((candidateLayer) =>
    String(candidateLayer.get("id") ?? "").includes("joined_")
  );
  if (!layer) return;
  const layerTitle=layer.getProperties().title;
  const source = layer.getSource();
  const view = map.getView();
  const resolution = view.getResolution();

  // ImageLayer#getSource() is typed as ImageSource in OpenLayers 6, so narrow
  // it again here before using the ImageWMS-specific GetFeatureInfo method.
  if (!(source instanceof ImageWMS) || resolution === undefined) return;

  const url = source.getFeatureInfoUrl(
    evt.coordinate,
    resolution,
    view.getProjection(),
    {
      INFO_FORMAT: 'application/json',
      FEATURE_COUNT: 10,
    },
  );

  if (!url) return;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`GetFeatureInfo failed: ${response.status}`);
    }

    const featureInfo: {
      features?: Array<{
        properties?: {
          name_pvx?: unknown;
          variable?: unknown;
          readable_date_time?: unknown;
          value?: unknown;
        };
      }>;
    } = await response.json();
    console.log('Feature info:', featureInfo);

    const properties = featureInfo.features?.[0]?.properties;
    if (!properties) {
      closeFeatureInfoPopup();
      return;
    }

    const numericValue = Number(properties.value);
    const unit =
      metadataRef.current?.vectorWmsLayers?.[0]?.natural_breaks_sld?.legend_title?.[1] ?? "";
    const variable = String(layerTitle)
      .replaceAll("_", " ")
      .trim();

    setFeatureInfoPopup({
      title: variable
        ? variable.charAt(0).toUpperCase() + variable.slice(1)
        : "Feature information",
      name: String(properties.name_pvx ?? "—"),
      date: String(properties.readable_date_time ?? "—"),
      value: Number.isFinite(numericValue)
        ? numericValue.toLocaleString(undefined, { maximumFractionDigits: 4 })
        : String(properties.value ?? "—"),
      unit,
    });
    popupOverlay.current?.setPosition(evt.coordinate);
  } catch (error) {
    console.error('Unable to get feature info:', error);
    closeFeatureInfoPopup();
  }
});

    return () => {
      resizeObserver.disconnect();
      mapRef.current?.removeControl(ctrl);
      mapRef.current?.removeControl(fullScreenControl);
      if (popupOverlay.current) {
        mapRef.current?.removeOverlay(popupOverlay.current);
        popupOverlay.current = null;
      }
      mapRef.current?.setTarget(undefined);
      mapRef.current = null;
    };
    
  
    
}, []);


useEffect(() => {

console.log("Metadata updated:", metadata);
const bboxExtent = metadata?.bbox?.extent;
const mapSize = mapRef.current?.getSize();
if (mapRef.current && bboxExtent?.length === 4 && mapSize) {
  mapRef.current.getView().fit(bboxExtent, { size: mapSize });
}

tifLayers.forEach((layer, index) => {
  const wmsBaseUrl = layer.wmsBaseUrl || metadata?.wmsBaseUrl;
  const wmsLayerName = layer.wmsLayerName;

  if (!wmsBaseUrl || !wmsLayerName) {
    return;
  }

  let isVisible=false;
  if (index ===0){
      isVisible=true;
  }

  const wmsLayer = new ImageLayer({
    source: new ImageWMS({
      crossOrigin: "anonymous",
      url: wmsBaseUrl,
      params: {'LAYERS': wmsLayerName, 'TILED': true},
      serverType: 'geoserver',
      // Countries have transparency, so do not fade tiles:
      // transition: 0,
    }),
  });
      
  wmsLayer.setProperties({
      id: layer.geoserverLayerName,
      baseLayer: false,
      displayInLayerSwitcher: false,
      legendPath: `${wmsBaseUrl}?REQUEST=GetLegendGraphic&STYLES=${layer.defaultStyle || ""}&LAYER=${wmsLayerName}&FORMAT=image%2Fpng`,
      title: layer.labelName?.replaceAll("_", " "),
    });
  
  const l1 = new LayerSwitcher(".layerCollection", wmsLayer, false, false, 'withOpacSlider', true);
  mapRef.current?.addLayer(wmsLayer);
  console.log('tif layer');
  l1.setVisible(isVisible);
});

vectorWmsLayers.forEach(async (layer) => {
  console.log(layer);
  const wmsBaseUrl = layer.wmsBaseUrl || metadata?.wmsBaseUrl;
  const wmsLayerName = layer.wmsLayerName || metadata?.layerName;
  const sldinfo = layer.natural_breaks_sld?.sld || "";
  const legendTitle=layer.natural_breaks_sld?.legend_title || [];
  const timeseriesdata =layer.timeseriesdata;

  const sldBodyNoNewLine = sldinfo
  .replace(/\r/g, "")
  .replace(/\n/g, "");

const encodedSLD = sldBodyNoNewLine ? encodeURIComponent(sldBodyNoNewLine) : "";

console.log(encodedSLD);


  const AllDateAndTimeList: TimeDimensionEntry[] = [];
  const AllLayersList: ImageLayer[] = [];
  let title = "";
  let layerId = "";

  if (!wmsBaseUrl || !wmsLayerName) {
    return;
  }

  let legendPath = "nodata";
  try {
    // ["Forest Loss", "(Hector)"]
    legendPath = await fetchWmsObjectUrl(
      wmsBaseUrl,
      {
        SERVICE: "WMS",
        VERSION: "1.1.0",
        REQUEST: "GetLegendGraphic",
        STYLES: "",
        LAYER: wmsLayerName,
        FORMAT: "image/png",
        WIDTH: 40,
        HEIGHT: 40,
        LEGEND_OPTIONS: encodeURIComponent("forceTitles:on;fontName:Arial;fontSize:12"),
      },
      encodedSLD,
      legendTitle
    );
  } catch (err) {
    console.error("Unable to load legend with SLD_BODY", err);
  }

  // let isVisible=false;
  // if (!tifLayers.length && index ===0){
  //     isVisible=true;
  // }
  if (timeseriesdata) {

    layer.vizParams?.forEach((obj1)=>{
            console.log(obj1)
            obj1.timeData?.forEach((obj2)=>{
                const variableName = obj1.variable;
                const time_in_ms = Number(obj2.value);
                const isoDate = new Date(time_in_ms).toISOString();
                const TimeDataObj = {
                    WMSURL: wmsBaseUrl,
                    dateisoFormat: isoDate,
                    dateisoFormatForLevel: obj2.label,
                    layerid: wmsLayerName+(obj2.value)?.toString(),
                    localDateTime: obj2.label,
                    visibility: false,
                    cqlFilter:`time_in_ms=${obj2.value}  AND variable = '${variableName}'`
                };
                AllDateAndTimeList.push(TimeDataObj);
            });
          title = obj1.variableLabel?.replaceAll("_", " ") ?? "";
          layerId = 'lyr_' +obj1.variable +'layerId'
    });

  AllDateAndTimeList.forEach((laObj)=>{
          const sourceObj = new ImageWMS({
              url: laObj.WMSURL,
              hidpi: false,
              params: {
                      'VERSION': '1.3.0',
                      'LAYERS': wmsLayerName,
                      'CQL_FILTER':laObj.cqlFilter,
                      // 'TRANSPARENT':false,
                      'FORMAT':'image/png'
              },
              crossOrigin: 'anonymous',
                imageLoadFunction: (image, src) => {
                  const imageElement = image.getImage() as HTMLImageElement;

                  const queryString = src.split("?")[1] || "";
                  const body = queryString
                    ? `${queryString}&SLD_BODY=${encodedSLD}`
                    : `SLD_BODY=${encodedSLD}`;

                  fetch(laObj.WMSURL, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/x-www-form-urlencoded",
                    },
                    body,
                  })
                    .then((response) => response.blob())
                    .then((blob) => {
                      // image.getImage().src = URL.createObjectURL(blob);

                    const objectUrl = URL.createObjectURL(blob);
                    imageElement.src = objectUrl;
                    });
                },
          });
          const lyr = new ImageLayer({
              visible:laObj.visibility,
              source:sourceObj
          });

            lyr.setProperties({
                  id:laObj.layerid,
                  baseLayer: false,
                  displayInLayerSwitcher: false,
                  legendPath: legendPath,
                  title:title
            });
	          AllLayersList.push(lyr);
	   });

	   
  const geoserverLayer = new TimeDimensionTile({
          id: layerId,
          title: title,
          visible: true,
          opacity: 1,
          legendPath: legendPath,
          showlegend: true,
          ThreddsDataServerVersion: "5",
          // timeSliderSize: 'small',
          alignTimeSlider: 'left',
          showAnimationButton: false,
          defaultLayerStartFrom: 0,
          showControlPanel: true,
          defaultTimeZone: 'local',
          source: {
              url: wmsBaseUrl,
              params: {
                  'VERSION': '1.1.0',
                  'LAYERS': wmsLayerName,
              }
          },
      });

      geoserverLayer.AllDateAndTimeList=AllDateAndTimeList
      geoserverLayer.AllLayersList=AllLayersList
      geoserverLayer.setInitialStartLayer();
      geoserverLayer.opacity=1;

      geoserverLayer.AllLayersList.forEach((value) => {
        const source = value?.getSource();
        source?.on('imageloadstart', geoserverLayer.tileLoadStart.bind(geoserverLayer));
        source?.on('imageloadend', geoserverLayer.tileLoadEnd.bind(geoserverLayer));
        source?.on('imageloaderror', geoserverLayer.tileLoadEnd.bind(geoserverLayer));
      });

      geoserverLayer.layerVisibilityInitiliazation();
      geoserverLayer.initilizationStatus = true;

      const syw = new LayerSwitcher(".layerCollection", geoserverLayer, false, true, 'withOpacSlider', true);
      (mapRef.current as (Map & { addThreddsLayer: (layer: TimeDimensionTile) => void }) | null)
        ?.addThreddsLayer(geoserverLayer);
      console.log('t2');
      console.log(geoserverLayer)
      syw.setVisible(true);

      console.log(geoserverLayer)

    }else{

    const sourceObj = new ImageWMS({
      url: wmsBaseUrl,
      hidpi: false,
      params: {
        VERSION: "1.1.0",
        LAYERS: wmsLayerName,
        FORMAT: "image/png",
      },
      crossOrigin: "anonymous",
      imageLoadFunction: (image, src) => {
        const imageElement = image.getImage() as HTMLImageElement;
        const queryString = src.split("?")[1] || "";
        const body = queryString
          ? `${queryString}&SLD_BODY=${encodedSLD}`
          : `SLD_BODY=${encodedSLD}`;

        fetch(wmsBaseUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body,
        })
          .then((response) => response.blob())
          .then((blob) => {
            imageElement.src = URL.createObjectURL(blob);
          });
      },
    });

    const wmsLayer = new ImageLayer({
      visible: false,
      source: sourceObj,
    });

    wmsLayer.setProperties({
      id: layer.geoserverLayerName+"AOI",
      title:'Selected AOI',
      baseLayer: false,
      displayInLayerSwitcher: false,
      legendPath,
      zIndex: 100000000000
    });

    const layerSwitcher = new LayerSwitcher(".layerCollection", wmsLayer, false, true, "withOpacSlider", true);
    mapRef.current?.addLayer(wmsLayer);
    layerSwitcher.setVisible(false);

    }


  });




}, [metadata, tifLayers, vectorWmsLayers]);



  return (
    <main className={embedded ? "bg-slate-50" : "min-h-screen bg-slate-50 lg:px-4 lg:py-4 sm:px-6 pt-15 sm:pt-15"}>
      <Dialog
        open={sharingPlatform !== null}
        onOpenChange={(open) => {
          if (!open && (shareTargetUrl || shareError)) {
            closeShareDialog();
          }
        }}
      >
        <DialogContent
          onEscapeKeyDown={(event) => {
            if (!shareTargetUrl && !shareError) event.preventDefault();
          }}
          onInteractOutside={(event) => {
            if (!shareTargetUrl && !shareError) event.preventDefault();
          }}
        >
          <DialogHeader>
            {!shareTargetUrl && !shareError ? (
              <>
                <div className="mx-auto mb-2 size-10 animate-spin rounded-full border-4 border-slate-200 border-t-teal-600" />
                <DialogTitle>Generating social share link…</DialogTitle>
                <DialogDescription>Please wait while your preview is prepared.</DialogDescription>
              </>
            ) : shareError ? (
              <>
                <DialogTitle>Unable to generate share link</DialogTitle>
                <DialogDescription>{shareError}</DialogDescription>
              </>
            ) : (
              <>
                <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full bg-emerald-100 text-xl text-emerald-700">✓</div>
                <DialogTitle>Social share link is ready</DialogTitle>
                <DialogDescription>
                  Your map and chart preview are ready to share.
                </DialogDescription>
              </>
            )}
          </DialogHeader>
          {(shareTargetUrl || shareError) && sharingPlatform ? (
            <DialogFooter>
              <Button variant="outline" onClick={closeShareDialog} type="button">
                Cancel
              </Button>
              {shareError ? (
                <Button onClick={() => void handleShare(sharingPlatform)} type="button">
                  Try again
                </Button>
              ) : (
                <Button onClick={openSocialShare} type="button">
                  Share on {SHARE_PLATFORM_LABELS[sharingPlatform]}
                </Button>
              )}
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Dialog>
      <div className="mx-auto flex flex-col gap-6">

        {shareId && !isAuthenticated ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-slate-700">
              Sign in or create an account to explore more PrithivieX services.
            </p>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline">
                <Link href="/login">Login</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Register</Link>
              </Button>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        ) : null}

        <div className="grid gap-6">
          <Card className="overflow-hidden p-0">
            <CardContent className="grid p-0 lg:p-0 lg:grid-cols-[20rem_minmax(0,1fr)]">
              <aside className="flex h-full flex-col border-b border-slate-200 bg-white p-2 lg:h-[45rem] lg:border-b-0 lg:border-r">
                <div>
                  <h2 className="mt-1 text-lg font-semibold text-slate-950">
                    {metadata?.serviceName || "Loading service"}
                  </h2>
                  {orderName ? (
                    <p className="mt-1 text-sm font-medium text-slate-600">
                      Order: <span className="text-slate-900">{orderName}</span>
                    </p>
                  ) : null}
                </div>
                <div className="mt-4 grid gap-2">
                  {downloadDataUrl && !shareId ? (
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
                  {selectedLayerDownloadUrl ? (
                    <Button asChild className="w-full" variant="outline">
                      <a download href={selectedLayerDownloadUrl} rel="noreferrer" target="_blank">
                        <Download />
                        Download selected layer
                      </a>
                    </Button>
                  ) : null}
                  {jobId ? (
                    <>
                      <Button asChild className="w-full" variant="outline">
                        <Link href={`/orders/${jobId}`}>
                          <ArrowLeft />
                          Back to details
                        </Link>
                      </Button>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <p className="text-center text-sm font-semibold text-slate-700">Share on</p>
                        <div className="mt-2 flex items-center justify-center gap-3" aria-label="Share result">
                          <button
                            aria-label="Share on LinkedIn"
                            className="rounded-full p-2 text-[#0a66c2] transition hover:bg-blue-100 disabled:opacity-50"
                            disabled={sharingPlatform !== null}
                            onClick={() => void handleShare("linkedin")}
                            type="button"
                          >
                            <LinkedInIcon className="size-6" />
                          </button>
                          <button
                            aria-label="Share on Facebook"
                            className="rounded-full p-2 text-[#1877f2] transition hover:bg-blue-100 disabled:opacity-50"
                            disabled={sharingPlatform !== null}
                            onClick={() => void handleShare("facebook")}
                            type="button"
                          >
                            <FacebookIcon className="size-6" />
                          </button>
                          <button
                            aria-label="Share on X"
                            className="rounded-full p-2 text-slate-950 transition hover:bg-slate-200 disabled:opacity-50"
                            disabled={sharingPlatform !== null}
                            onClick={() => void handleShare("x")}
                            type="button"
                          >
                            <XIcon className="size-6" />
                          </button>
                        </div>
                      </div>
                    </>
                  ) : null}
                </div>

                <div className="mt-5 flex min-h-0 flex-1 flex-col">
                  <div className="flex shrink-0 items-center gap-2">
                    <Layers3 className="size-4 text-teal-700" />
                    <h3 className="text-sm font-semibold text-slate-950">View Layers</h3>
                  </div>
                  <div className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-lg border border-slate-200">
                    {layers.length ? (
                      <div className="layerCollection"></div>
                    ) : (
                      <div className="px-3 py-4 text-sm text-slate-500">No layers available.</div>
                    )}
                  </div>
                </div>
              </aside>

              <div className="relative min-w-0">
                <div
                  ref={mapElement}
                  className="result-wms-map h-[40rem] w-full lg:h-[45rem]"
                />
                {!metadata && !error ? (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/50">
                    <div className="flex flex-col items-center gap-3 rounded-2xl bg-white/90 px-6 py-5 shadow-lg backdrop-blur">
                      <div className="h-12 w-12 rounded-full border-4 border-slate-200 border-t-teal-600 animate-spin" />
                      <p className="text-sm font-medium text-slate-900">Loading map data…</p>
                    </div>
                  </div>
                ) : null}
                <div
                  ref={popupElement}
                  className={`relative min-w-64 ${
                    featureInfoPopup ? "" : "hidden"
                  }`}
                >
                  {featureInfoPopup ? (
                    <div className="relative z-10 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
                      <div className="flex items-center justify-between bg-gradient-to-r from-teal-700 to-emerald-600 px-4 py-3 text-white">
                        <p className="text-sm font-semibold tracking-wide">{featureInfoPopup.title}</p>
                        <button
                          aria-label="Close feature information"
                          className="ml-4 rounded-md px-2 py-0.5 text-lg leading-none transition hover:bg-white/20"
                          onClick={closeFeatureInfoPopup}
                          type="button"
                        >
                          ×
                        </button>
                      </div>
                      <table className="w-full text-sm">
                        <tbody className="divide-y divide-slate-100">
                          <tr>
                            <th className="bg-slate-50 px-4 py-3 text-left font-medium text-slate-500">Name</th>
                            <td className="px-4 py-3 text-right font-semibold text-slate-900">{featureInfoPopup.name}</td>
                          </tr>
                          <tr>
                            <th className="bg-slate-50 px-4 py-3 text-left font-medium text-slate-500">Date</th>
                            <td className="px-4 py-3 text-right text-slate-700">{featureInfoPopup.date}</td>
                          </tr>
                          <tr>
                            <th className="bg-slate-50 px-4 py-3 text-left font-medium text-slate-500">Value</th>
                            <td className="px-4 py-3 text-right font-semibold text-teal-700">
                              {featureInfoPopup.value}{featureInfoPopup.unit ? ` ${featureInfoPopup.unit}` : ""}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                  {featureInfoPopup ? (
                    <span
                      aria-hidden="true"
                      className="absolute -bottom-2 left-1/2 z-20 size-4 -translate-x-1/2 rotate-45 border-b border-r border-slate-200 bg-white"
                    />
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="bg-white p-4">
                <ProcessingCharts chartData={metadata?.chartData} jobId={jobId} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
