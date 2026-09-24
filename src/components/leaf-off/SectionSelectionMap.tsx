"use client";

import { useEffect, useRef, useState } from "react";
import { Crosshair, Maximize2 } from "lucide-react";
import type Feature from "ol/Feature";
import Map from "ol/Map";
import View from "ol/View";
import GeoJSON from "ol/format/GeoJSON";
import VectorLayer from "ol/layer/Vector";
import { transformExtent } from "ol/proj";
import VectorSource from "ol/source/Vector";
import { Fill, Stroke, Style } from "ol/style";
import { createEmpty, extend, isEmpty, type Extent } from "ol/extent";
import LayerSwitcherImage from "ol-ext/control/LayerSwitcherImage.js";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UK_EXTENT_LONLAT, createBaseLayers, fitDuration } from "./map-base-layers";

export type SelectableSection = {
  id: number;
  label: string;
  section_polygon: unknown;
};

// Idle / selected / hovered, per the UX spec. Amber hover is never confused with
// the selected teal or the readiness ramp.
const IDLE_STYLE = new Style({
  fill: new Fill({ color: "rgba(100, 116, 139, 0.12)" }),
  stroke: new Stroke({ color: "#64748b", width: 1.5 }),
  zIndex: 1,
});
const SELECTED_STYLE = new Style({
  fill: new Fill({ color: "rgba(20, 184, 166, 0.28)" }),
  stroke: new Stroke({ color: "#0f766e", width: 3 }),
  zIndex: 2,
});
const HOVER_IDLE_STYLE = new Style({
  fill: new Fill({ color: "rgba(100, 116, 139, 0.18)" }),
  stroke: new Stroke({ color: "#f59e0b", width: 4 }),
  zIndex: 3,
});
const HOVER_SELECTED_STYLE = new Style({
  fill: new Fill({ color: "rgba(20, 184, 166, 0.34)" }),
  stroke: new Stroke({ color: "#f59e0b", width: 4 }),
  zIndex: 3,
});

type StyleState = {
  hovered: number | null;
  selected: Set<number>;
  visible: Set<number>;
};

function readFeatures(sections: SelectableSection[]) {
  const format = new GeoJSON();
  const features: Feature[] = [];

  for (const section of sections) {
    if (!section.section_polygon) {
      continue;
    }
    try {
      const [feature] = format.readFeatures(
        { type: "Feature", geometry: section.section_polygon, properties: { label: section.label } },
        { dataProjection: "EPSG:4326", featureProjection: "EPSG:3857" },
      );
      if (feature) {
        feature.setId(section.id);
        features.push(feature);
      }
    } catch {
      // A malformed boundary should not take the whole map down.
    }
  }

  return features;
}

function extentOf(source: VectorSource, ids: Iterable<number>) {
  const extent: Extent = createEmpty();
  for (const id of ids) {
    const geometry = source.getFeatureById(id)?.getGeometry();
    if (geometry) {
      extend(extent, geometry.getExtent());
    }
  }
  return isEmpty(extent) ? null : extent;
}

/**
 * All runnable sections on one map. Selection lives in the parent; this map
 * mirrors it and reports hovers and clicks. Features are built once per list
 * and restyled from refs, so ticking a box never rebuilds the map.
 */
export function SectionSelectionMap({
  className,
  focusRequest,
  hoveredId,
  onHover,
  onToggle,
  sections,
  selectedIds,
  visibleIds,
}: {
  className?: string;
  /** Fit to one section; bump `nonce` to repeat the same id. */
  focusRequest: { id: number; nonce: number } | null;
  hoveredId: number | null;
  onHover: (id: number | null) => void;
  onToggle: (id: number) => void;
  sections: SelectableSection[];
  selectedIds: Set<number>;
  visibleIds: Set<number>;
}) {
  const targetRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const sourceRef = useRef<VectorSource | null>(null);
  const layerRef = useRef<VectorLayer | null>(null);
  const styleStateRef = useRef<StyleState>({ hovered: null, selected: new Set(), visible: new Set() });
  const onHoverRef = useRef(onHover);
  const onToggleRef = useRef(onToggle);
  const hasFittedRef = useRef(false);
  const initialFitRef = useRef<() => void>(() => undefined);
  const [tooltip, setTooltip] = useState<{ label: string; selected: boolean; x: number; y: number } | null>(null);

  useEffect(() => {
    onHoverRef.current = onHover;
    onToggleRef.current = onToggle;
  }, [onHover, onToggle]);

  // Build the map once.
  useEffect(() => {
    const target = targetRef.current;
    if (!target) {
      return;
    }

    const source = new VectorSource();
    const layer = new VectorLayer({
      source,
      style: (feature) => {
        const id = Number(feature.getId());
        const state = styleStateRef.current;
        if (!state.visible.has(id)) {
          // No styles = not drawn and not hit-detected.
          return [];
        }
        const selected = state.selected.has(id);
        if (state.hovered === id) {
          return selected ? HOVER_SELECTED_STYLE : HOVER_IDLE_STYLE;
        }
        return selected ? SELECTED_STYLE : IDLE_STYLE;
      },
    });
    layer.setProperties({ baseLayer: false, displayInLayerSwitcher: false });

    const map = new Map({
      layers: [...createBaseLayers("osm"), layer],
      target,
      view: new View({ center: [0, 0], zoom: 2 }),
    });
    map.getView().fit(transformExtent(UK_EXTENT_LONLAT, "EPSG:4326", "EPSG:3857"), { padding: [24, 24, 24, 24] });

    const layerSwitcher = new LayerSwitcherImage({ collapsed: false });
    layerSwitcher.isOpen(true);
    map.addControl(layerSwitcher);

    let lastHovered: number | null = null;
    map.on("pointermove", (event) => {
      if (event.dragging) {
        return;
      }
      const feature = map.forEachFeatureAtPixel(event.pixel, (candidate) => candidate, {
        layerFilter: (candidate) => candidate === layer,
      });
      const id = feature ? Number(feature.getId()) : null;
      map.getTargetElement().style.cursor = feature ? "pointer" : "";
      if (id !== lastHovered) {
        lastHovered = id;
        onHoverRef.current(id);
      }
      setTooltip(
        feature
          ? {
              label: String(feature.get("label") ?? ""),
              selected: styleStateRef.current.selected.has(id as number),
              x: event.pixel[0],
              y: event.pixel[1],
            }
          : null,
      );
    });

    map.on("singleclick", (event) => {
      const feature = map.forEachFeatureAtPixel(event.pixel, (candidate) => candidate, {
        layerFilter: (candidate) => candidate === layer,
      });
      if (feature) {
        onToggleRef.current(Number(feature.getId()));
      }
    });

    const leave = () => {
      lastHovered = null;
      setTooltip(null);
      onHoverRef.current(null);
    };
    target.addEventListener("pointerleave", leave);

    // Fit to every section once, as soon as there are features AND the map has a
    // real size (on mobile it starts hidden behind the List tab).
    const tryInitialFit = () => {
      const size = map.getSize();
      if (hasFittedRef.current || !size || size[0] === 0 || size[1] === 0 || source.getFeatures().length === 0) {
        return;
      }
      hasFittedRef.current = true;
      map.getView().fit(source.getExtent(), { maxZoom: 15, padding: [48, 48, 64, 48] });
    };
    initialFitRef.current = tryInitialFit;

    const resizeObserver = new ResizeObserver(() => {
      map.updateSize();
      tryInitialFit();
    });
    resizeObserver.observe(target);

    mapRef.current = map;
    sourceRef.current = source;
    layerRef.current = layer;

    return () => {
      target.removeEventListener("pointerleave", leave);
      resizeObserver.disconnect();
      map.removeControl(layerSwitcher);
      map.setTarget(undefined);
      mapRef.current = null;
      sourceRef.current = null;
      layerRef.current = null;
    };
  }, []);

  // Replace features when the list itself changes (load / refresh).
  useEffect(() => {
    const source = sourceRef.current;
    if (!source) {
      return;
    }
    source.clear(true);
    source.addFeatures(readFeatures(sections));
    initialFitRef.current();
  }, [sections]);

  // Restyle on selection / hover / filter changes.
  useEffect(() => {
    styleStateRef.current = { hovered: hoveredId, selected: selectedIds, visible: visibleIds };
    layerRef.current?.changed();
  }, [hoveredId, selectedIds, visibleIds]);

  useEffect(() => {
    if (!focusRequest) {
      return;
    }
    const source = sourceRef.current;
    const extent = source ? extentOf(source, [focusRequest.id]) : null;
    if (extent) {
      mapRef.current?.getView().fit(extent, { duration: fitDuration(250), maxZoom: 15, padding: [48, 48, 48, 48] });
    }
  }, [focusRequest]);

  const fitTo = (ids: Iterable<number>) => {
    const source = sourceRef.current;
    const extent = source ? extentOf(source, ids) : null;
    if (extent) {
      mapRef.current?.getView().fit(extent, { duration: fitDuration(250), maxZoom: 15, padding: [48, 48, 48, 48] });
    }
  };

  const selectedCount = selectedIds.size;

  return (
    <div
      aria-label="Map of runnable train sections"
      className={cn("relative", className)}
      role="region"
    >
      <div className="h-full w-full" ref={targetRef} />

      <p className="pointer-events-none absolute left-12 top-2 rounded-md bg-white/90 px-2 py-1 text-xs font-medium text-slate-700 shadow">
        {selectedCount} of {sections.length} selected
      </p>

      {tooltip ? (
        <div
          className="pointer-events-none absolute z-10 max-w-64 -translate-x-1/2 -translate-y-full rounded-md bg-slate-950/85 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg ring-1 ring-white/10 backdrop-blur-sm"
          style={{ left: tooltip.x, top: tooltip.y - 12 }}
        >
          {tooltip.label}
          <span className="block text-[11px] font-normal text-slate-300">
            {tooltip.selected ? "Click to deselect" : "Click to select"}
          </span>
        </div>
      ) : null}

      <div className="absolute bottom-3 left-3 flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white/95 p-1.5 shadow-lg backdrop-blur-sm">
        <Button
          disabled={selectedCount === 0}
          onClick={() => fitTo(selectedIds)}
          size="sm"
          type="button"
          variant="outline"
        >
          <Crosshair aria-hidden="true" />
          Zoom to selection
        </Button>
        <Button
          disabled={visibleIds.size === 0}
          onClick={() => fitTo(visibleIds)}
          size="sm"
          type="button"
          variant="outline"
        >
          <Maximize2 aria-hidden="true" />
          Show all
        </Button>
      </div>
    </div>
  );
}
