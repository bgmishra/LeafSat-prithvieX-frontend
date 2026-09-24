"use client";

import type ImageWrapper from "ol/Image";
import type Tile from "ol/Tile";
import { authorizedFetch } from "@/api/client";

/**
 * Loading WMS images through the backend's authenticated proxy.
 *
 * The proxy requires `Authorization: Bearer`, which a plain `<img src>` (how
 * OpenLayers loads WMS by default) cannot send. These loaders fetch the image
 * with the header instead (refreshing the token on 401, like every other API
 * call), hand OpenLayers an object URL, and revoke it once the image has
 * decoded so blobs do not pile up while panning.
 *
 * GeoServer reports WMS errors as an XML document with status 200. Anything
 * that is not an image is treated as a load error, so the map shows its error
 * state instead of a broken tile.
 */
async function loadInto(img: HTMLImageElement, src: string) {
  try {
    const response = await authorizedFetch(src);
    const contentType = response.headers.get("Content-Type") ?? "";

    if (!response.ok || !contentType.startsWith("image/")) {
      img.dispatchEvent(new Event("error"));
      return;
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const revoke = () => URL.revokeObjectURL(objectUrl);
    img.addEventListener("load", revoke, { once: true });
    img.addEventListener("error", revoke, { once: true });
    img.src = objectUrl;
  } catch {
    img.dispatchEvent(new Event("error"));
  }
}

/** `imageLoadFunction` for ImageWMS sources pointed at the WMS proxy. */
export function authorizedImageLoadFunction(image: ImageWrapper, src: string) {
  const element = image.getImage();
  if (element instanceof HTMLImageElement) {
    void loadInto(element, src);
  }
}

/** `tileLoadFunction` for TileWMS sources pointed at the WMS proxy. */
export function authorizedTileLoadFunction(tile: Tile, src: string) {
  const element = (tile as Tile & { getImage?: () => unknown }).getImage?.();
  if (element instanceof HTMLImageElement) {
    void loadInto(element, src);
  }
}

/**
 * Read the first numeric band value from a GeoServer GetFeatureInfo JSON
 * response for a raster layer (`{"features":[{"properties":{"GRAY_INDEX":0.62}}]}`).
 * Returns null for nodata or when the point is outside the raster.
 */
export async function fetchRasterValue(url: string, nodata = -9999): Promise<number | null> {
  const response = await authorizedFetch(url);
  if (!response.ok) {
    throw new Error(`GetFeatureInfo failed with status ${response.status}`);
  }
  const payload = (await response.json()) as {
    features?: Array<{ properties?: Record<string, unknown> }>;
  };
  const properties = payload.features?.[0]?.properties;
  if (!properties) {
    return null;
  }
  const value = Object.values(properties).find((item) => typeof item === "number");
  if (typeof value !== "number" || !Number.isFinite(value) || value <= nodata || value < 0) {
    return null;
  }
  return value;
}
