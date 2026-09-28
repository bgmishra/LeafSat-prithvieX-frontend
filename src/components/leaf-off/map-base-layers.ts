"use client";

import { useSyncExternalStore } from "react";
import type Map from "ol/Map";
import TileLayer from "ol/layer/Tile";
import { transformExtent } from "ol/proj";
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

/**
 * Open on the UK.
 *
 * Every map in the app is looking at British track, so the whole country is
 * the one starting view that is never wrong. Call it straight after building
 * the map: a map with data of its own fits to that instead, and a map without
 * any has somewhere sensible to sit rather than the mid-Atlantic.
 */
export function fitToUnitedKingdom(map: Map, padding = 24) {
  map.getView().fit(transformExtent(UK_EXTENT_LONLAT, "EPSG:4326", "EPSG:3857"), {
    padding: [padding, padding, padding, padding],
  });
}

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

function subscribeToReducedMotion(onChange: () => void) {
  const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  query?.addEventListener("change", onChange);
  return () => query?.removeEventListener("change", onChange);
}

/**
 * The same setting, but as something a component can render from.
 *
 * Code that merely skips an animation can call `prefersReducedMotion()` at the
 * point it would have started one. Anything that renders *differently* — a
 * play button that should not exist at all when motion is unwelcome — has to
 * come through here instead: reading matchMedia during render would disagree
 * with the server's HTML, and reading it in an effect costs a second pass and
 * a visible flicker. The server is told motion is fine, which is what the
 * markup it produces already assumes, and the subscription also catches the
 * setting being changed while the page is open.
 */
export function useReducedMotion() {
  return useSyncExternalStore(subscribeToReducedMotion, prefersReducedMotion, () => false);
}

/** Fit animation duration that honours prefers-reduced-motion. */
export function fitDuration(ms = 250) {
  return prefersReducedMotion() ? 0 : ms;
}
