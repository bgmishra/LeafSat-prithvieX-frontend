"use client";

import { useEffect, useRef, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import GeoJSON from "ol/format/GeoJSON";
import GeometryType from "ol/geom/GeometryType";
import Draw from "ol/interaction/Draw";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import Map from "ol/Map";
import { fromLonLat } from "ol/proj";
import OSM from "ol/source/OSM";
import VectorSource from "ol/source/Vector";
import { Fill, Stroke, Style } from "ol/style";
import View from "ol/View";
import type { BackendValidationErrors, ResourceField } from "@/admin/types/resources";
import { FieldErrorText, getFieldError } from "./FormFields";

type Mode = "upload" | "draw";

/**
 * A "file" input that also lets the admin draw a Polygon directly on a map as an
 * alternative to uploading a file. The file goes under `field.name`; a drawn
 * polygon goes under `field.geojsonFieldName` as a raw GeoJSON geometry. Only one
 * of the two is populated at a time.
 */
export function GeometryInput({
  backendErrors,
  disabled,
  field,
  form,
}: {
  backendErrors: BackendValidationErrors;
  disabled?: boolean;
  field: ResourceField;
  form: UseFormReturn<Record<string, unknown>>;
}) {
  const geojsonFieldName = field.geojsonFieldName || `${field.name}_geojson`;
  const [mode, setMode] = useState<Mode>("upload");
  const mapTargetRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const vectorSourceRef = useRef(new VectorSource());

  const fileValue = form.watch(field.name);
  const geojsonValue = form.watch(geojsonFieldName);
  const selectedFile = fileValue instanceof File ? fileValue : undefined;
  const hasDrawnGeometry = Boolean(geojsonValue);

  const fileError = getFieldError(form, backendErrors, field.name);
  const geojsonError = getFieldError(form, backendErrors, geojsonFieldName);

  function clearDrawing() {
    vectorSourceRef.current.clear();
    form.setValue(geojsonFieldName, undefined, { shouldDirty: true, shouldValidate: true });
  }

  useEffect(() => {
    if (mode !== "draw" || !mapTargetRef.current || mapRef.current) {
      return;
    }

    const vectorLayer = new VectorLayer({
      source: vectorSourceRef.current,
      style: new Style({
        fill: new Fill({ color: "rgba(20, 184, 166, 0.2)" }),
        stroke: new Stroke({ color: "#0f766e", width: 3 }),
      }),
    });
    const osm = new TileLayer({ source: new OSM({ crossOrigin: "anonymous" }) });

    const map = new Map({
      layers: [osm, vectorLayer],
      target: mapTargetRef.current,
      view: new View({ center: fromLonLat([84.124, 28.3949]), zoom: 6.6 }),
    });
    mapRef.current = map;

    const draw = new Draw({ source: vectorSourceRef.current, type: GeometryType.POLYGON });

    draw.on("drawstart", () => {
      vectorSourceRef.current.clear();
    });

    draw.on("drawend", (event) => {
      const drawnGeometry = event.feature.getGeometry();
      if (!drawnGeometry) {
        return;
      }

      const geojsonGeometry = new GeoJSON().writeGeometryObject(drawnGeometry, {
        dataProjection: "EPSG:4326",
        featureProjection: "EPSG:3857",
      });
      form.setValue(geojsonFieldName, geojsonGeometry, { shouldDirty: true, shouldValidate: true });
      form.setValue(field.name, undefined, { shouldDirty: true, shouldValidate: true });
    });

    map.addInteraction(draw);

    const resizeObserver = new ResizeObserver(() => map.updateSize());
    resizeObserver.observe(mapTargetRef.current);

    return () => {
      resizeObserver.disconnect();
      map.removeInteraction(draw);
      map.setTarget(undefined);
      mapRef.current = null;
    };
  }, [field.name, form, geojsonFieldName, mode]);

  return (
    <div className="block">
      <span className="text-sm font-medium text-slate-800">{field.label}</span>

      <div className="mt-2 inline-flex overflow-hidden rounded-md border border-slate-300">
        <button
          className={`px-3 py-1.5 text-xs font-semibold transition ${
            mode === "upload" ? "bg-teal-700 text-white" : "bg-white text-slate-700 hover:bg-slate-50"
          }`}
          disabled={disabled}
          onClick={() => setMode("upload")}
          type="button"
        >
          Upload File
        </button>
        <button
          className={`border-l border-slate-300 px-3 py-1.5 text-xs font-semibold transition ${
            mode === "draw" ? "bg-teal-700 text-white" : "bg-white text-slate-700 hover:bg-slate-50"
          }`}
          disabled={disabled}
          onClick={() => setMode("draw")}
          type="button"
        >
          Draw on Map
        </button>
      </div>

      {mode === "upload" ? (
        <div className="mt-3">
          <input
            accept={field.accept}
            className="block w-full text-sm text-slate-700 file:mr-3 file:min-h-11 file:cursor-pointer file:rounded-md file:border-0 file:bg-teal-700 file:px-4 file:text-sm file:font-semibold file:text-white file:transition hover:file:bg-teal-800 disabled:opacity-60"
            disabled={disabled}
            onChange={(event) => {
              const file = event.target.files?.[0];
              form.setValue(field.name, file, { shouldDirty: true, shouldValidate: true });
              if (file) {
                form.setValue(geojsonFieldName, undefined, { shouldDirty: true, shouldValidate: true });
              }
            }}
            type="file"
          />
          {selectedFile ? <p className="mt-1 text-xs text-slate-600">Selected: {selectedFile.name}</p> : null}
          <FieldErrorText message={fileError} />
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <div aria-label="Draw section boundary" className="h-72 w-full overflow-hidden rounded-md border border-slate-300" ref={mapTargetRef} />
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              {hasDrawnGeometry
                ? "Polygon captured."
                : "Click on the map to start drawing a polygon; double-click to finish."}
            </p>
            <button
              className="rounded-md border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              disabled={disabled || !hasDrawnGeometry}
              onClick={clearDrawing}
              type="button"
            >
              Clear
            </button>
          </div>
          <FieldErrorText message={geojsonError} />
        </div>
      )}

      {field.helpText ? <p className="mt-1 text-xs text-slate-500">{field.helpText}</p> : null}
    </div>
  );
}
