"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Feature from "ol/Feature";
import Map from "ol/Map";
import View from "ol/View";
import GeoJSON from "ol/format/GeoJSON";
import GeometryType from "ol/geom/GeometryType";
import Draw from "ol/interaction/Draw";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import OSM from "ol/source/OSM";
import VectorSource from "ol/source/Vector";
import XYZSource from "ol/source/XYZ";
import { Circle, Fill, Stroke, Style } from "ol/style";
import LayerSwitcherImage from "ol-ext/control/LayerSwitcherImage.js";
import ModifyFeature from "ol-ext/interaction/ModifyFeature.js";
import { Button } from "@/components/ui/button";
import { ErrorMessage, TextField } from "@/components/ui";
import {
  SECTION_ATTRIBUTE_FIELDS,
  type RailwaySection,
  type SectionAttributes,
} from "@/lib/sections";

/**
 * What the author is doing to the boundary right now.
 *
 * `shape` is the default because fixing a rejected section almost always means
 * nudging a few vertices of what is already there, not starting again.
 */
type Tool = "shape" | "redraw";

/** How the replacement boundary is arriving. */
type Source = "map" | "file";

export type RejectedEditPayload = {
  attributes: SectionAttributes;
  boundary: { file?: File; geojson?: unknown };
  resubmit: boolean;
};

const DRAWN_STYLE = new Style({
  fill: new Fill({ color: "rgba(20, 184, 166, 0.2)" }),
  image: new Circle({
    fill: new Fill({ color: "#0f766e" }),
    radius: 5,
    stroke: new Stroke({ color: "#ffffff", width: 2 }),
  }),
  stroke: new Stroke({ color: "#0f766e", width: 3 }),
});

const format = new GeoJSON();
const PROJECTIONS = { dataProjection: "EPSG:4326", featureProjection: "EPSG:3857" } as const;

function featuresFromGeometry(geometry: unknown): Feature[] {
  if (!geometry) {
    return [];
  }

  try {
    return format.readFeatures({ type: "Feature", geometry, properties: {} }, PROJECTIONS);
  } catch {
    return [];
  }
}

/** The single geometry currently on the map, as GeoJSON in EPSG:4326. */
function geometryFromSource(source: VectorSource): unknown {
  const feature = source.getFeatures()[0];
  const geometry = feature?.getGeometry();

  return geometry ? format.writeGeometryObject(geometry, PROJECTIONS) : null;
}

/**
 * The fix-up screen for a section that came back rejected.
 *
 * Distinct from the ordinary create form because the job is different: the
 * boundary already exists and is usually nearly right, so this opens with it
 * loaded and editable rather than with an empty map, and keeps the reviewer's
 * reason on screen the whole time. Vertex editing is ol-ext's ModifyFeature —
 * drag to move, click a segment to insert, alt-click to remove — with the
 * original always one click away via Revert.
 */
export function RejectedSectionEditor({
  busy,
  onCancel,
  onSubmit,
  section,
}: {
  busy?: boolean;
  onCancel: () => void;
  onSubmit: (payload: RejectedEditPayload) => void;
  section: RailwaySection;
}) {
  const targetRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const sourceRef = useRef<VectorSource>(new VectorSource());
  const modifyRef = useRef<{ setActive: (active: boolean) => void } | null>(null);
  const drawRef = useRef<Draw | null>(null);

  // The boundary as it was when the editor opened. Held in a ref so that a list
  // refresh handing us a new object for the same geometry cannot retrigger the
  // map-building effect and throw away edits in progress. "Revert to saved"
  // means this, which is also what the server still holds.
  const savedBoundaryRef = useRef<unknown>(section.section_polygon ?? null);

  const [tool, setTool] = useState<Tool>("shape");
  const [boundarySource, setBoundarySource] = useState<Source>("map");
  const [geojson, setGeojson] = useState<unknown>(section.section_polygon ?? null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [attributes, setAttributes] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      SECTION_ATTRIBUTE_FIELDS.map((field) => [field.name, section[field.name] ?? ""]),
    ),
  );

  const syncFromMap = useCallback(() => {
    setGeojson(geometryFromSource(sourceRef.current));
    setBoundarySource("map");
    setFile(null);
  }, []);

  /** Put a geometry on the map, replacing whatever is there, and zoom to it. */
  const loadOntoMap = useCallback((geometry: unknown) => {
    const source = sourceRef.current;
    source.clear();

    const features = featuresFromGeometry(geometry);
    if (features.length === 0) {
      setGeojson(null);
      return;
    }

    source.addFeatures(features);
    setGeojson(geometry);

    const extent = source.getExtent();
    if (mapRef.current && extent.every(Number.isFinite)) {
      mapRef.current.getView().fit(extent, { duration: 250, maxZoom: 17, padding: [32, 32, 32, 32] });
    }
  }, []);

  // Build the map once. The section being fixed does not change underneath the
  // editor — the workspace re-keys this component per record — so there is no
  // reason to tear the map down and rebuild it.
  useEffect(() => {
    if (!targetRef.current || mapRef.current) {
      return;
    }

    const source = sourceRef.current;
    const vectorLayer = new VectorLayer({ source, style: DRAWN_STYLE });
    vectorLayer.setProperties({ baseLayer: false, displayInLayerSwitcher: false });

    // Same three base maps as the boundary preview. Imagery matters here: you
    // are checking a boundary against the actual track, not against a road map.
    const satellite = new TileLayer({
      source: new XYZSource({
        attributions: "Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, and the GIS User Community",
        maxZoom: 19,
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      }),
      visible: true,
    });
    satellite.setProperties({ baseLayer: true, displayInLayerSwitcher: true, title: "Satellite Imaginary" });

    const osm = new TileLayer({ source: new OSM({ crossOrigin: "anonymous" }), visible: false });
    osm.setProperties({ baseLayer: true, displayInLayerSwitcher: true, title: "OSM" });

    const topo = new TileLayer({
      source: new XYZSource({ url: "https://{a-c}.tile.opentopomap.org/{z}/{x}/{y}.png" }),
      visible: false,
    });
    topo.setProperties({ baseLayer: true, displayInLayerSwitcher: true, title: "Open Topo Map" });

    const map = new Map({
      layers: [satellite, osm, topo, vectorLayer],
      target: targetRef.current,
      view: new View({ center: [0, 0], zoom: 2 }),
    });
    mapRef.current = map;

    const layerSwitcher = new LayerSwitcherImage({ collapsed: false });
    layerSwitcher.isOpen(true);
    map.addControl(layerSwitcher);

    // ol-ext rather than ol/interaction/Modify: it reports only the features it
    // actually touched, and alt-click vertex removal works without extra wiring.
    const modify = new ModifyFeature({ sources: [source], pixelTolerance: 12 });
    modify.on("modifyend", syncFromMap);
    map.addInteraction(modify);
    modifyRef.current = modify;

    const draw = new Draw({ source, type: GeometryType.POLYGON });
    // A section is exactly one polygon, so a fresh outline replaces the old one
    // rather than adding a second.
    draw.on("drawstart", () => source.clear());
    draw.on("drawend", (event) => {
      // Read off the event: the feature is not in the source yet at drawend.
      const drawn = event.feature.getGeometry();
      if (!drawn) {
        return;
      }

      setGeojson(format.writeGeometryObject(drawn, PROJECTIONS));
      setBoundarySource("map");
      setFile(null);
      // Straight into vertex editing, so the outline can be tidied up without
      // having to reach for the toolbar first.
      setTool("shape");
    });
    draw.setActive(false);
    map.addInteraction(draw);
    drawRef.current = draw;

    loadOntoMap(savedBoundaryRef.current);

    const resizeObserver = new ResizeObserver(() => map.updateSize());
    resizeObserver.observe(targetRef.current);

    return () => {
      resizeObserver.disconnect();
      map.removeControl(layerSwitcher);
      map.removeInteraction(modify);
      map.removeInteraction(draw);
      map.setTarget(undefined);
      mapRef.current = null;
      modifyRef.current = null;
      drawRef.current = null;
    };
  }, [loadOntoMap, syncFromMap]);

  // Only one tool drives the pointer at a time, and neither does while the
  // boundary is coming from an uploaded file.
  useEffect(() => {
    const editable = boundarySource === "map";
    modifyRef.current?.setActive(editable && tool === "shape");
    drawRef.current?.setActive(editable && tool === "redraw");
  }, [boundarySource, tool]);

  function clearBoundary() {
    sourceRef.current.clear();
    setGeojson(null);
    setBoundarySource("map");
    setFile(null);
    setTool("redraw");
  }

  function revertBoundary() {
    setBoundarySource("map");
    setFile(null);
    setTool("shape");
    loadOntoMap(savedBoundaryRef.current);
  }

  /**
   * A GeoPackage can only be read by the server, so it replaces the boundary on
   * save and the map stands aside. GeoJSON we can parse here, so it is loaded in
   * and stays editable — which is the point of uploading into an editor.
   */
  async function handleFile(chosen: File | null) {
    setError("");

    if (!chosen) {
      return;
    }

    if (chosen.name.toLowerCase().endsWith(".gpkg")) {
      setFile(chosen);
      setBoundarySource("file");
      return;
    }

    try {
      const parsed = JSON.parse(await chosen.text());
      const geometry = parsed?.type === "FeatureCollection"
        ? parsed.features?.[0]?.geometry
        : parsed?.type === "Feature"
          ? parsed.geometry
          : parsed;

      if (!geometry?.type) {
        throw new Error("no geometry");
      }

      setFile(null);
      setBoundarySource("map");
      setTool("shape");
      loadOntoMap(geometry);
    } catch {
      setError(
        "Could not read that file as GeoJSON. Upload a .geojson containing one polygon, or a .gpkg to have the server read it.",
      );
    }
  }

  function save(resubmit: boolean) {
    if (boundarySource === "map" && !geojson) {
      setError("This section has no boundary. Draw one, upload one, or revert to the saved boundary.");
      return;
    }

    setError("");
    onSubmit({
      attributes,
      boundary: boundarySource === "file" ? { file: file ?? undefined } : { geojson },
      resubmit,
    });
  }

  const usingFile = boundarySource === "file";

  return (
    <div className="grid gap-5">
      <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
          Rejected — what needs fixing
        </p>
        <p className="mt-1 text-sm text-red-900">
          {section.review_note || "No reason was recorded."}
        </p>
        {section.reviewed_by_name ? (
          <p className="mt-1 text-xs text-red-700">
            Rejected by {section.reviewed_by_name}
            {section.reviewed_at ? ` on ${new Date(section.reviewed_at).toLocaleDateString()}` : ""}
          </p>
        ) : null}
      </div>

      <ErrorMessage message={error} />

      <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
        <div className="grid content-start gap-4 sm:grid-cols-2 lg:grid-cols-1">
          {SECTION_ATTRIBUTE_FIELDS.map((field) => (
            <TextField
              defaultValue={attributes[field.name]}
              key={field.name}
              label={field.label}
              name={field.name}
              onChange={(event) =>
                setAttributes((current) => ({ ...current, [field.name]: event.target.value }))
              }
            />
          ))}
        </div>

        <div className="grid content-start gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex overflow-hidden rounded-md border border-slate-300">
              <button
                aria-pressed={!usingFile && tool === "shape"}
                className={`px-3 py-1.5 text-xs font-semibold transition ${
                  !usingFile && tool === "shape"
                    ? "bg-teal-700 text-white"
                    : "bg-white text-slate-700 hover:bg-slate-50"
                }`}
                disabled={busy || usingFile || !geojson}
                onClick={() => setTool("shape")}
                type="button"
              >
                Edit shape
              </button>
              <button
                aria-pressed={!usingFile && tool === "redraw"}
                className={`border-l border-slate-300 px-3 py-1.5 text-xs font-semibold transition ${
                  !usingFile && tool === "redraw"
                    ? "bg-teal-700 text-white"
                    : "bg-white text-slate-700 hover:bg-slate-50"
                }`}
                disabled={busy || usingFile}
                onClick={() => setTool("redraw")}
                type="button"
              >
                Draw new
              </button>
            </div>

            <button
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              disabled={busy || (!geojson && !usingFile)}
              onClick={clearBoundary}
              type="button"
            >
              Clear
            </button>
            <button
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              disabled={busy}
              onClick={revertBoundary}
              type="button"
            >
              Revert to saved
            </button>
          </div>

          <div className="relative">
            <div
              aria-label="Edit section boundary"
              className="h-[28rem] max-h-[70vh] w-full overflow-hidden rounded-md border border-slate-300 sm:h-[34rem]"
              ref={targetRef}
            />
            {usingFile ? (
              <div className="absolute inset-0 flex items-center justify-center rounded-md bg-slate-950/60 px-6 text-center">
                <p className="max-w-sm text-sm font-medium text-white">
                  The boundary will be replaced by <strong>{file?.name}</strong> when you save. The
                  server reads GeoPackage files, so it cannot be previewed or edited here — press
                  Revert to saved to go back to editing on the map.
                </p>
              </div>
            ) : null}
          </div>

          <p className="text-xs text-slate-500">
            {usingFile
              ? "Boundary coming from an uploaded file."
              : geojson
                ? "Drag a vertex to move it, click a segment to add one, alt-click a vertex to remove it."
                : "No boundary. Draw one on the map, upload one, or revert to the saved boundary."}
          </p>

          <div>
            <label className="text-xs font-semibold text-slate-700" htmlFor="replacement-boundary">
              Or upload a replacement boundary
            </label>
            <input
              accept=".gpkg,.geojson,.json"
              className="mt-1 block w-full text-sm text-slate-700 file:mr-3 file:min-h-9 file:cursor-pointer file:rounded-md file:border-0 file:bg-slate-700 file:px-3 file:text-xs file:font-semibold file:text-white hover:file:bg-slate-800"
              disabled={busy}
              id="replacement-boundary"
              onChange={(event) => void handleFile(event.target.files?.[0] ?? null)}
              type="file"
            />
            <p className="mt-1 text-xs text-slate-500">
              A .geojson is loaded straight onto the map and stays editable. A .gpkg is read by the
              server when you save.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-4">
        <Button disabled={busy} onClick={() => save(true)}>
          {busy ? "Working..." : "Save and send for approval"}
        </Button>
        <Button disabled={busy} onClick={() => save(false)} variant="outline">
          Save without sending
        </Button>
        <Button disabled={busy} onClick={onCancel} type="button" variant="outline">
          Cancel
        </Button>
      </div>
    </div>
  );
}
