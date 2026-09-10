"use client";

import { useEffect, useRef } from "react";
import ImageLayer from "ol/layer/Image";
import Map from "ol/Map";
import View from "ol/View";
import { transformExtent } from "ol/proj";
import ImageWMS from "ol/source/ImageWMS";
import type { ProcessingJobStatusResponse, ProcessingVectorWmsLayer } from "@/lib/api";

import OSM from "ol/source/OSM";
import { fromLonLat } from "ol/proj";
import TileLayer from "ol/layer/Tile";

type Extent = [number, number, number, number];

function layerExtent(layer: ProcessingVectorWmsLayer): Extent | null {
  const bbox = layer.bbox;

  if (!bbox) {
    return null;
  }

  if (bbox.extent?.length === 4) {
    return bbox.extent;
  }

  const minX = bbox.minX ?? bbox.minx;
  const minY = bbox.minY ?? bbox.miny;
  const maxX = bbox.maxX ?? bbox.maxx;
  const maxY = bbox.maxY ?? bbox.maxy;

  return [minX, minY, maxX, maxY].every((value) => typeof value === "number")
    ? [minX as number, minY as number, maxX as number, maxY as number]
    : null;
}

export function AoiWmsMap({ job }: { job: ProcessingJobStatusResponse }) {
  const targetRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const polygonLayer = job.vectorWmsLayers?.find((layer) =>
    layer.geoserverLayerName?.toLowerCase().startsWith("polygon_"),
  );
  const wmsBaseUrl = polygonLayer?.wmsBaseUrl || job.wmsBaseUrl;

  useEffect(() => {
    if (!targetRef.current || !polygonLayer?.geoserverLayerName || !wmsBaseUrl) {
      return;
    }
        const osm = new TileLayer({
          opacity: 1,
          source: new OSM({ crossOrigin: "anonymous" }),
          visible: true
        });
  const sldinfo = polygonLayer.natural_breaks_sld?.sld || "";
  const sldBodyNoNewLine = sldinfo
  .replace(/\r/g, "")
  .replace(/\n/g, "");

const encodedSLD = sldBodyNoNewLine ? encodeURIComponent(sldBodyNoNewLine) : "";

    const sourceObj = new ImageWMS({
      url: wmsBaseUrl,
      hidpi: false,
      params: {
        VERSION: "1.1.0",
        LAYERS: polygonLayer?.wmsLayerName,
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
      visible: true,
      source: sourceObj,
    });

    wmsLayer.setProperties({
      id: "AOI",
      title:'Selected AOI',
      baseLayer: false,
      displayInLayerSwitcher: false,
      zIndex: 100000000000
    });

    const map = new Map({
      target: targetRef.current,
      layers: [osm,wmsLayer],
      view: new View({
        center: fromLonLat([84.124, 28.3949]),
        zoom: 6.6,
      }),
    });
    mapRef.current = map;

    const extent = layerExtent(polygonLayer);
    if (extent) {
      const sourceProjection = polygonLayer.srs || polygonLayer.bbox?.crs || "EPSG:4326";
      try {
        map.getView().fit(
          sourceProjection === "EPSG:3857"
            ? extent
            : transformExtent(extent, sourceProjection, "EPSG:3857"),
          { duration: 250, padding: [24, 24, 24, 24], maxZoom: 16 },
        );
      } catch {
        // The WMS remains visible even when its reported CRS is not recognized.
      }
    }

    const resizeObserver = new ResizeObserver(() => map.updateSize());
    resizeObserver.observe(targetRef.current);

    return () => {
      resizeObserver.disconnect();
      map.setTarget(undefined);
      mapRef.current = null;
    };
  }, [polygonLayer, wmsBaseUrl]);

  if (!polygonLayer?.geoserverLayerName || !wmsBaseUrl) {
    return null;
  }

  return <div aria-label="Selected area of interest map" className="h-80 w-full overflow-hidden rounded-md border border-slate-200" ref={targetRef} />;
}