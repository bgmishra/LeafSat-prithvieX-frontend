"use client";

import { useEffect, useMemo, useRef } from "react";
import type Feature from "ol/Feature";
import Map from "ol/Map";
import View from "ol/View";
import GeoJSON from "ol/format/GeoJSON";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import LayerSwitcherImage from "ol-ext/control/LayerSwitcherImage.js";
import { fromLonLat, transformExtent } from "ol/proj";
import OSM from "ol/source/OSM";
import VectorSource from "ol/source/Vector";
import XYZSource from "ol/source/XYZ";
import { Fill, Stroke, Style } from "ol/style";

function readGeometryFeatures(geometry: unknown): { error: string; features: Feature[] } {
  if (!geometry) {
    return { error: "", features: [] };
  }

  try {
    const features = new GeoJSON().readFeatures(
      { type: "Feature", geometry, properties: {} },
      { dataProjection: "EPSG:4326", featureProjection: "EPSG:3857" },
    );

    if (features.length === 0) {
      return { error: "This record has no boundary to display.", features: [] };
    }

    return { error: "", features };
  } catch {
    return { error: "Unable to read this boundary's geometry.", features: [] };
  }
}

const DEFAULT_CLASS_NAME = "h-80 w-full overflow-hidden rounded-md border border-slate-200";
// Rough bounding box for the UK (west, south, east, north) in EPSG:4326, used as
// the map's default view whenever there is no boundary to fit to.
const UK_EXTENT_LONLAT: [number, number, number, number] = [-8.65, 49.82, 1.76, 60.85];

/** Renders a single GeoJSON Polygon/MultiPolygon geometry on an OpenLayers map. */
export function GeoJsonMapPreview({
  className = DEFAULT_CLASS_NAME,
  geometry,
}: {
  /** Sizing/border classes for the map's container. Defaults to a fixed 320px box. */
  className?: string;
  geometry: unknown;
}) {
  const targetRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const { error, features } = useMemo(() => readGeometryFeatures(geometry), [geometry]);

  useEffect(() => {
    if (!targetRef.current) {
      return;
    }

    const vectorSource = new VectorSource({ features });
    const vectorLayer = new VectorLayer({
      source: vectorSource,
      style: new Style({
        fill: new Fill({ color: "rgba(20, 184, 166, 0.2)" }),
        stroke: new Stroke({ color: "#0f766e", width: 3 }),
      }),
    });
    vectorLayer.setProperties({ baseLayer: false, displayInLayerSwitcher: false });

    // Same three switchable base maps as the Data Extraction workspace.
    const satellite = new TileLayer({
      source: new XYZSource({
        attributions:
          "Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
        maxZoom: 19,
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      }),
      visible: false,
    });
    satellite.setProperties({ baseLayer: true, displayInLayerSwitcher: true, title: "Satellite Imaginary" });

    const osm = new TileLayer({ opacity: 1, source: new OSM(), visible: true });
    osm.setProperties({ baseLayer: true, displayInLayerSwitcher: true, title: "OSM" });

    const openTopomap = new TileLayer({
      opacity: 1,
      source: new XYZSource({ url: "https://{a-c}.tile.opentopomap.org/{z}/{x}/{y}.png" }),
      visible: false,
    });
    openTopomap.setProperties({ baseLayer: true, displayInLayerSwitcher: true, title: "Open Topo Map" });

    const map = new Map({
      layers: [satellite, osm, openTopomap, vectorLayer],
      target: targetRef.current,
      view: new View({
        center: fromLonLat([84.124, 28.3949]),
        zoom: 6.6,
      }),
    });
    mapRef.current = map;

    const layerSwitcher = new LayerSwitcherImage({ collapsed: false });
    layerSwitcher.isOpen(true);
    map.addControl(layerSwitcher);

    if (features.length > 0) {
      const extent = vectorSource.getExtent();
      if (extent.every((value) => Number.isFinite(value))) {
        map.getView().fit(extent, { duration: 250, maxZoom: 17, padding: [24, 24, 24, 24] });
      }
    } else {
      map.getView().fit(transformExtent(UK_EXTENT_LONLAT, "EPSG:4326", "EPSG:3857"), { padding: [24, 24, 24, 24] });
    }

    const resizeObserver = new ResizeObserver(() => map.updateSize());
    resizeObserver.observe(targetRef.current);

    return () => {
      resizeObserver.disconnect();
      map.removeControl(layerSwitcher);
      map.setTarget(undefined);
      mapRef.current = null;
    };
  }, [features]);

  return (
    <div className={`relative ${className}`}>
      <div aria-label="Boundary map" className="h-full w-full" ref={targetRef} />
      {!geometry ? (
        <p className="absolute left-2 top-2 rounded bg-white/90 px-2 py-1 text-xs text-slate-600 shadow">
          No boundary selected — showing the UK.
        </p>
      ) : null}
      {error ? (
        <p className="absolute inset-x-2 bottom-2 rounded bg-white/90 px-2 py-1 text-xs text-red-600 shadow">{error}</p>
      ) : null}
    </div>
  );
}
