"use client";

import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import XYZSource from "ol/source/XYZ";

export type BaseMapKey = "osm" | "satellite" | "topo";

/**
 * The three switchable base maps used across the app (the same set, titles and
 * sources as GeoJsonMapPreview), for use with ol-ext's LayerSwitcherImage.
 */
export function createBaseLayers(initial: BaseMapKey = "osm") {
  const satellite = new TileLayer({
    source: new XYZSource({
      attributions:
        "Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
      maxZoom: 19,
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    }),
    visible: initial === "satellite",
  });
  satellite.setProperties({ baseLayer: true, displayInLayerSwitcher: true, title: "Satellite Imaginary" });

  const osm = new TileLayer({ opacity: 1, source: new OSM(), visible: initial === "osm" });
  osm.setProperties({ baseLayer: true, displayInLayerSwitcher: true, title: "OSM" });

  const openTopomap = new TileLayer({
    opacity: 1,
    source: new XYZSource({ url: "https://{a-c}.tile.opentopomap.org/{z}/{x}/{y}.png" }),
    visible: initial === "topo",
  });
  openTopomap.setProperties({ baseLayer: true, displayInLayerSwitcher: true, title: "Open Topo Map" });

  return [satellite, osm, openTopomap];
}

/** Rough bounding box for the UK (west, south, east, north) in EPSG:4326. */
export const UK_EXTENT_LONLAT: [number, number, number, number] = [-8.65, 49.82, 1.76, 60.85];

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/** Fit animation duration that honours prefers-reduced-motion. */
export function fitDuration(ms = 250) {
  return prefersReducedMotion() ? 0 : ms;
}
