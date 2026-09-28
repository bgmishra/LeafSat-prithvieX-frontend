"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, FlaskConical, Loader2, MousePointerClick, RotateCw } from "lucide-react";
import Map from "ol/Map";
import Overlay from "ol/Overlay";
import OverlayPositioning from "ol/OverlayPositioning";
import View from "ol/View";
import FullScreen from "ol/control/FullScreen";
import { defaults as defaultControls } from "ol/control";
import { isEmpty, type Extent } from "ol/extent";
import GeoJSON from "ol/format/GeoJSON";
import ImageLayer from "ol/layer/Image";
import VectorLayer from "ol/layer/Vector";
import { transformExtent } from "ol/proj";
import ImageWMS from "ol/source/ImageWMS";
import VectorSource from "ol/source/Vector";
import { Fill, Stroke, Style } from "ol/style";
import LayerSwitcherImage from "ol-ext/control/LayerSwitcherImage.js";
import { createBaseLayers, fitDuration, fitToUnitedKingdom } from "@/components/leaf-off/map-base-layers";
import type { LonLatBbox, WmsLayerInfo, WmsLayerKind } from "@/lib/model-runs";
import { bandFor, useModelProduct } from "./model-product";
import { cn } from "@/lib/utils";
import { authorizedImageLoadFunction, fetchRasterValue } from "@/lib/wms";

export type LayerVisibility = Record<WmsLayerKind | "outline", boolean>;

type LayerStatus = "idle" | "loading" | "loaded" | "error";

/**
 * One WMS layer on the map. `groupKey` records which section it was built for,
 * so a swap can tell "the next pass of the same section" — worth holding on to
 * while the new image loads — from "a different section altogether".
 */
type WmsEntry = { groupKey: string; layer: ImageLayer; source: ImageWMS };

type WmsRegistry = Partial<Record<WmsLayerKind, WmsEntry>>;

/**
 * How long a changed WMS layer waits before it is requested.
 *
 * Dragging the imagery slider walks through every pass between where the drag
 * started and where it ends. Without a pause each of those would cost the map
 * server a render, so the request is held until the drag settles; short enough
 * that a click on the next-pass button still feels immediate.
 */
const SWAP_DEBOUNCE_MS = 180;

const LAYER_NAMES: Record<WmsLayerKind, string> = {
  readiness: "readiness map",
  sentinel2: "Sentinel-2 image",
  landsat: "Landsat image",
  forecast: "forecast map",
};

const LAYER_KINDS = Object.keys(LAYER_NAMES) as WmsLayerKind[];

// Stacking: basemaps (0) → Landsat → Sentinel-2 → readiness / forecast → outline.
const Z_INDEX: Record<WmsLayerKind, number> = { landsat: 5, sentinel2: 6, readiness: 10, forecast: 10 };

// A double stroke (white halo + dark core) reads over red, yellow, green,
// satellite imagery and OSM alike. No fill, so the raster is never tinted.
const OUTLINE_STYLE = [
  new Style({ stroke: new Stroke({ color: "rgba(255, 255, 255, 0.95)", width: 4 }) }),
  new Style({ stroke: new Stroke({ color: "#0f172a", width: 1.75 }) }),
];
const FAILED_OUTLINE_STYLE = new Style({
  fill: new Fill({ color: "rgba(239, 68, 68, 0.08)" }),
  stroke: new Stroke({ color: "#dc2626", lineDash: [6, 4], width: 2 }),
});

function fitPadding() {
  const wide = typeof window !== "undefined" && window.matchMedia?.("(min-width: 1024px)").matches;
  // Leave room for the legend card along the bottom on desktop.
  return wide ? [56, 56, 210, 56] : [40, 40, 40, 40];
}

function createWmsLayer(kind: WmsLayerKind, wms: WmsLayerInfo) {
  const source = new ImageWMS({
    imageLoadFunction: authorizedImageLoadFunction,
    params: { FORMAT: "image/png", LAYERS: wms.layer, TRANSPARENT: true, VERSION: "1.1.1" },
    ratio: 1,
    url: wms.url,
  });
  const layer = new ImageLayer({ source, zIndex: Z_INDEX[kind] });
  // The side panel owns overlay toggles; the ol-ext switcher is for base maps only.
  layer.setProperties({ baseLayer: false, displayInLayerSwitcher: false });
  return { layer, source };
}

/**
 * One section's result: basemaps, the Landsat and Sentinel-2 true-colour
 * images and the readiness raster (all WMS through the authenticated API
 * proxy), and the section outline. For Leaf-Off Forecast the product's primary
 * layer is the forecast probability raster instead, and there is no imagery.
 * Opacity and click-to-read always act on the product's primary layer.
 */
export function ReadinessResultMap({
  bbox,
  className,
  failed,
  hudLabel,
  isSynthetic,
  label,
  legend,
  opacity,
  outline,
  visibility,
  wms,
  zoomNonce,
}: {
  bbox: LonLatBbox | null;
  className?: string;
  failed: boolean;
  /** Small dark chip at the top, e.g. "RC-A · Sentinel-2 01 Sep 2026". */
  hudLabel?: string;
  isSynthetic: boolean;
  label: string;
  /** Rendered bottom-left over the map on desktop. */
  legend?: React.ReactNode;
  /** Readiness layer opacity, 0–1. */
  opacity: number;
  outline: unknown;
  visibility: LayerVisibility;
  /** Kinds that are absent are treated as null. */
  wms: Partial<Record<WmsLayerKind, WmsLayerInfo | null>>;
  /** Bump to re-fit the view to the section. */
  zoomNonce: number;
}) {
  const { legend: legendCopy, mapNoun, primaryLayer } = useModelProduct();
  const primaryRef = useRef(primaryLayer);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const targetRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const outlineSourceRef = useRef<VectorSource | null>(null);
  const outlineLayerRef = useRef<VectorLayer | null>(null);
  const markerRef = useRef<Overlay | null>(null);
  const wmsRef = useRef<WmsRegistry>({});
  const visibilityRef = useRef(visibility);
  const opacityRef = useRef(opacity);
  const extentRef = useRef<Extent | null>(null);
  const fittedRef = useRef(false);
  const [status, setStatus] = useState<Record<WmsLayerKind, LayerStatus>>({
    forecast: "idle",
    landsat: "idle",
    readiness: "idle",
    sentinel2: "idle",
  });
  const [inspect, setInspect] = useState<{ state: "loading" | "value" | "nodata" | "error"; value?: number } | null>(
    null,
  );

  const readinessUrl = wms.readiness?.url ?? "";
  const readinessLayerName = wms.readiness?.layer ?? "";
  const s2Url = wms.sentinel2?.url ?? "";
  const s2LayerName = wms.sentinel2?.layer ?? "";
  const landsatUrl = wms.landsat?.url ?? "";
  const landsatLayerName = wms.landsat?.layer ?? "";
  const forecastUrl = wms.forecast?.url ?? "";
  const forecastLayerName = wms.forecast?.layer ?? "";
  const outlineKey = outline ? JSON.stringify(outline) : "";
  const bboxKey = bbox ? bbox.join(",") : "";

  useEffect(() => {
    visibilityRef.current = visibility;
    opacityRef.current = opacity;
  }, [opacity, visibility]);

  // Map, basemaps, outline layer and controls: built once.
  useEffect(() => {
    const target = targetRef.current;
    const wrapper = wrapperRef.current;
    if (!target || !wrapper) {
      return;
    }

    const outlineSource = new VectorSource();
    const outlineLayer = new VectorLayer({ source: outlineSource, style: OUTLINE_STYLE, zIndex: 20 });
    outlineLayer.setProperties({ baseLayer: false, displayInLayerSwitcher: false });

    const fullScreen = new FullScreen({ source: wrapper });
    const map = new Map({
      controls: defaultControls().extend([fullScreen]),
      layers: [...createBaseLayers("satellite"), outlineLayer],
      target,
      view: new View({ center: [0, 0], zoom: 2 }),
    });
    fitToUnitedKingdom(map);
    (fullScreen as unknown as { element: HTMLElement }).element.querySelector("button")?.setAttribute("aria-label", "Toggle full screen");

    const layerSwitcher = new LayerSwitcherImage({ collapsed: false });
    layerSwitcher.isOpen(true);
    map.addControl(layerSwitcher);

    const markerElement = document.createElement("div");
    markerElement.className = "size-3 rounded-full border-2 border-slate-950 bg-white shadow";
    const marker = new Overlay({ element: markerElement, positioning: OverlayPositioning.CENTER_CENTER, stopEvent: false });
    map.addOverlay(marker);

    // Click to read the primary layer's value, so the ramp never relies on colour alone.
    let inspectToken = 0;
    map.on("singleclick", (event) => {
      const kind = primaryRef.current;
      const primary = wmsRef.current[kind];
      const resolution = map.getView().getResolution();
      if (!primary || !visibilityRef.current[kind] || resolution === undefined) {
        return;
      }
      const url = primary.source.getFeatureInfoUrl(event.coordinate, resolution, "EPSG:3857", {
        FEATURE_COUNT: 1,
        INFO_FORMAT: "application/json",
      });
      if (!url) {
        return;
      }
      const token = ++inspectToken;
      marker.setPosition(event.coordinate);
      setInspect({ state: "loading" });
      fetchRasterValue(url)
        .then((value) => {
          if (token === inspectToken) {
            setInspect(value === null ? { state: "nodata" } : { state: "value", value });
          }
        })
        .catch(() => {
          if (token === inspectToken) {
            setInspect({ state: "error" });
          }
        });
    });

    const resizeObserver = new ResizeObserver(() => {
      map.updateSize();
      const extent = extentRef.current;
      const size = map.getSize();
      if (!fittedRef.current && extent && size && size[0] > 0 && size[1] > 0) {
        fittedRef.current = true;
        map.getView().fit(extent, { maxZoom: 17, padding: fitPadding() });
      }
    });
    resizeObserver.observe(target);

    mapRef.current = map;
    outlineSourceRef.current = outlineSource;
    outlineLayerRef.current = outlineLayer;
    markerRef.current = marker;

    return () => {
      resizeObserver.disconnect();
      map.removeControl(layerSwitcher);
      map.setTarget(undefined);
      mapRef.current = null;
      outlineSourceRef.current = null;
      outlineLayerRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Outline geometry.
  useEffect(() => {
    const source = outlineSourceRef.current;
    if (!source) {
      return;
    }
    source.clear(true);
    if (!outlineKey) {
      return;
    }
    try {
      source.addFeatures(
        new GeoJSON().readFeatures(
          { type: "Feature", geometry: JSON.parse(outlineKey), properties: {} },
          { dataProjection: "EPSG:4326", featureProjection: "EPSG:3857" },
        ),
      );
    } catch {
      // An unreadable outline leaves the raster and basemap usable.
    }
  }, [outlineKey]);

  useEffect(() => {
    outlineLayerRef.current?.setStyle(failed ? FAILED_OUTLINE_STYLE : OUTLINE_STYLE);
  }, [failed]);

  // The view extent: the result bbox, else the outline.
  useEffect(() => {
    const map = mapRef.current;
    let extent: Extent | null = null;
    if (bboxKey) {
      const parts = bboxKey.split(",").map(Number);
      if (parts.length === 4 && parts.every(Number.isFinite)) {
        extent = transformExtent(parts as Extent, "EPSG:4326", "EPSG:3857");
      }
    }
    if (!extent) {
      const outlineExtent = outlineSourceRef.current?.getExtent();
      if (outlineExtent && !isEmpty(outlineExtent) && outlineExtent.every(Number.isFinite)) {
        extent = outlineExtent;
      }
    }
    extentRef.current = extent;
    const size = map?.getSize();
    if (map && extent && size && size[0] > 0 && size[1] > 0) {
      const first = !fittedRef.current;
      fittedRef.current = true;
      map.getView().fit(extent, {
        duration: first ? 0 : fitDuration(400),
        maxZoom: 17,
        padding: fitPadding(),
      });
    }
  }, [bboxKey, outlineKey, zoomNonce]);

  // One effect per WMS layer, keyed by its URL and layer name, so polling the
  // run (new objects, same values) never reloads imagery. The bbox doubles as
  // the group key: it changes when the viewer moves to another section, and
  // that is the one swap that must not hold the old image over the new view.
  useWmsLayer("readiness", readinessUrl, readinessLayerName, bboxKey, mapRef, wmsRef, visibilityRef, opacityRef, setStatus);
  useWmsLayer("sentinel2", s2Url, s2LayerName, bboxKey, mapRef, wmsRef, visibilityRef, opacityRef, setStatus);
  useWmsLayer("landsat", landsatUrl, landsatLayerName, bboxKey, mapRef, wmsRef, visibilityRef, opacityRef, setStatus);
  useWmsLayer("forecast", forecastUrl, forecastLayerName, bboxKey, mapRef, wmsRef, visibilityRef, opacityRef, setStatus);

  useEffect(() => {
    const layers = wmsRef.current;
    layers.readiness?.layer.setVisible(visibility.readiness);
    layers.sentinel2?.layer.setVisible(visibility.sentinel2);
    layers.landsat?.layer.setVisible(visibility.landsat);
    layers.forecast?.layer.setVisible(visibility.forecast);
    outlineLayerRef.current?.setVisible(visibility.outline);
    if (!visibility[primaryLayer]) {
      markerRef.current?.setPosition(undefined);
    }
  }, [primaryLayer, visibility]);

  useEffect(() => {
    wmsRef.current[primaryLayer]?.layer.setOpacity(opacity);
  }, [opacity, primaryLayer]);

  const retry = (kind: WmsLayerKind) => {
    wmsRef.current[kind]?.source.refresh();
  };

  const visibleKinds = LAYER_KINDS.filter((kind) => visibility[kind] && wms[kind]);
  const loadingKinds = visibleKinds.filter((kind) => status[kind] === "loading");
  const errorKinds = visibleKinds.filter((kind) => status[kind] === "error");
  const inspectVisible = inspect && visibility[primaryLayer];

  return (
    <div
      aria-label={`${mapNoun.charAt(0).toUpperCase()}${mapNoun.slice(1)} for ${label}`}
      className={cn("result-wms-map relative bg-slate-900", className)}
      ref={wrapperRef}
      role="region"
    >
      <div className="h-full w-full" ref={targetRef} />

      {/* Top-centre HUD: what is on screen, and the clicked value. */}
      <div className="pointer-events-none absolute inset-x-0 top-2 flex flex-col items-center gap-1.5 px-24">
        {hudLabel ? (
          <p className="max-w-full truncate rounded-md bg-slate-950/85 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg ring-1 ring-white/10 backdrop-blur-sm">
            {hudLabel}
          </p>
        ) : null}
        {inspectVisible ? (
          <p
            aria-live="polite"
            className="rounded-md bg-slate-950/85 px-2.5 py-1.5 font-mono text-xs font-medium tabular-nums text-white shadow-lg ring-1 ring-white/10 backdrop-blur-sm"
          >
            {inspect.state === "loading"
              ? "Reading value…"
              : inspect.state === "value" && typeof inspect.value === "number"
                ? `${inspect.value.toFixed(2)} · ${bandFor(inspect.value, legendCopy.labels)}`
                : inspect.state === "nodata"
                  ? "No data here"
                  : "Couldn't read the value"}
          </p>
        ) : null}
      </div>

      {isSynthetic ? (
        <p className="pointer-events-none absolute left-12 top-2 inline-flex items-center gap-1 rounded-md bg-violet-50/95 px-2 py-1 text-[11px] font-semibold text-violet-800 shadow ring-1 ring-violet-200">
          <FlaskConical aria-hidden="true" className="size-3.5" />
          Synthetic data
        </p>
      ) : null}

      {/* Load / error chips, bottom-right above the attribution. */}
      <div className="absolute bottom-10 right-3 flex max-w-[calc(100%-1.5rem)] flex-col items-end gap-1.5">
        {loadingKinds.length > 0 ? (
          <p className="inline-flex items-center gap-1.5 rounded-md bg-slate-950/85 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg ring-1 ring-white/10">
            <Loader2 aria-hidden="true" className="size-3.5 motion-safe:animate-spin motion-reduce:animate-none" />
            Loading {loadingKinds.map((kind) => LAYER_NAMES[kind]).join(", ")}…
          </p>
        ) : null}
        {errorKinds.map((kind) => (
          <div
            className="flex items-center gap-2 rounded-md border border-red-200 bg-white/95 px-2.5 py-1.5 text-xs text-red-700 shadow-lg"
            key={kind}
            role="alert"
          >
            <AlertTriangle aria-hidden="true" className="size-3.5 shrink-0" />
            <span>The {LAYER_NAMES[kind]} couldn&apos;t be loaded from the map server.</span>
            <button
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-semibold text-red-800 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
              onClick={() => retry(kind)}
              type="button"
            >
              <RotateCw aria-hidden="true" className="size-3" />
              Retry
            </button>
          </div>
        ))}
      </div>

      {failed ? (
        <p className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-md bg-slate-950/85 px-3 py-2 text-xs font-medium text-white shadow-lg ring-1 ring-white/10">
          No {primaryLayer} layer: processing failed
        </p>
      ) : null}

      {legend ? (
        <div className="absolute bottom-3 left-3 hidden w-72 rounded-lg border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur-sm lg:block">
          {legend}
          {wms[primaryLayer] ? (
            <p className="mt-2 flex items-center gap-1.5 border-t border-slate-200 pt-2 text-[11px] text-slate-500">
              <MousePointerClick aria-hidden="true" className="size-3.5" />
              Click the map to read a value.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Keep one kind of WMS layer on the map, rebuilt whenever its URL or layer
 * name changes.
 *
 * Tearing the old layer down before the new one exists blanks the map for as
 * long as the map server takes to answer, which turns a scrub through the
 * imagery timeline into a strobe. So the layer that is on screen stays there,
 * underneath the incoming one, until the incoming one has actually painted —
 * a WMS layer draws nothing until its image arrives, so the two share a
 * z-index quite happily and the handover is invisible.
 *
 * The layer on screen therefore outlives the effect that created it, and
 * `wmsRef` — which opacity, visibility, click-to-read and retry all act on —
 * always points at it rather than at whatever is still in flight.
 */
function useWmsLayer(
  kind: WmsLayerKind,
  url: string,
  layerName: string,
  /** Identifies the section these layers belong to; see `WmsEntry`. */
  groupKey: string,
  mapRef: React.RefObject<Map | null>,
  wmsRef: React.RefObject<WmsRegistry>,
  visibilityRef: React.RefObject<LayerVisibility>,
  opacityRef: React.RefObject<number>,
  setStatus: React.Dispatch<React.SetStateAction<Record<WmsLayerKind, LayerStatus>>>,
) {
  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    const registry = wmsRef.current;
    const update = (next: LayerStatus) => setStatus((current) => (current[kind] === next ? current : { ...current, [kind]: next }));
    const drop = () => {
      const stale = registry[kind];
      if (stale) {
        map.removeLayer(stale.layer);
        delete registry[kind];
      }
      update("idle");
    };

    if (!url || !layerName) {
      drop();
      return;
    }

    // Only a layer that is on screen and shows this same section is worth
    // waiting for the replacement behind: a hidden layer has nothing to
    // protect, and another section's image stretched over the new extent would
    // be a lie rather than a smoother swap.
    const current = registry[kind];
    const handover = current !== undefined && current.groupKey === groupKey && visibilityRef.current[kind];
    if (!handover) {
      drop();
    }

    let incoming: WmsEntry | null = null;
    let promoted = false;

    const promote = () => {
      if (promoted || !incoming) {
        return;
      }
      promoted = true;
      const outgoing = registry[kind];
      registry[kind] = incoming;
      if (outgoing && outgoing.layer !== incoming.layer) {
        map.removeLayer(outgoing.layer);
      }
      // Toggles made while the image was in flight only reached the layer that
      // was on screen, so the newcomer picks them up as it takes over.
      incoming.layer.setVisible(visibilityRef.current[kind]);
      if (kind === "readiness" || kind === "forecast") {
        incoming.layer.setOpacity(opacityRef.current);
      }
    };

    const start = () => {
      const { layer, source } = createWmsLayer(kind, { layer: layerName, url });
      layer.setVisible(visibilityRef.current[kind]);
      if (kind === "readiness" || kind === "forecast") {
        layer.setOpacity(opacityRef.current);
      }

      source.on("imageloadstart", () => update("loading"));
      // An error promotes too: the map has to stop showing an image the user is
      // no longer looking at, and the retry chip must act on the layer that failed.
      source.on("imageloadend", () => {
        promote();
        update("loaded");
      });
      source.on("imageloaderror", () => {
        promote();
        update("error");
      });

      incoming = { groupKey, layer, source };
      map.addLayer(layer);
      if (!handover) {
        promote();
      }
    };

    const timer = handover ? window.setTimeout(start, SWAP_DEBOUNCE_MS) : undefined;
    if (!handover) {
      start();
    }

    return () => {
      window.clearTimeout(timer);
      // Superseded before it ever painted: take it back off the map and leave
      // what is on screen alone, for the next run to replace in its turn.
      if (incoming && !promoted) {
        map.removeLayer(incoming.layer);
      }
    };
  }, [groupKey, kind, layerName, mapRef, opacityRef, setStatus, url, visibilityRef, wmsRef]);

  // The swap effect deliberately leaves the layer that is on screen attached,
  // so going away is the only moment left to take it off the map.
  useEffect(() => {
    const map = mapRef.current;
    const registry = wmsRef.current;
    return () => {
      const entry = registry[kind];
      if (entry) {
        map?.removeLayer(entry.layer);
        delete registry[kind];
      }
    };
  }, [kind, mapRef, wmsRef]);
}
