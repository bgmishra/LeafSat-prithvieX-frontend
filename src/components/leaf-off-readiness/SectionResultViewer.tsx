"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Cloud, Copy, Crosshair, Satellite, SearchX, XCircle } from "lucide-react";
import { useAuthUser } from "@/admin/hooks/useAuthUser";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatUtc, formatDate, pluralize } from "@/lib/format";
import {
  IMAGERY_SENSORS,
  imageryTimeline,
  isActiveRunStatus,
  markSharedResultViewedFor,
  type ImageryPass,
  type ImagerySensor,
  type ImageryTimeline,
  type ModelRunResultDetail,
  type ReadinessModelInfo,
  type SceneInfo,
  type SceneSearch,
  type WmsLayerInfo,
  type WmsLayerKind,
} from "@/lib/model-runs";
import { cn } from "@/lib/utils";
import { IconEmptyState } from "./IconEmptyState";
import { ImageryTimelineControl, SENSOR_LABELS } from "./ImageryTimelineControl";
import { ReadinessLegend } from "./ReadinessLegend";
import { ReadinessResultMap, type LayerVisibility } from "./ReadinessResultMap";
import { useModelProduct } from "./model-product";
import { RESULTS_HEADING_ID } from "./results-routes";
import { SyntheticNotice, UncalibratedModelNotice } from "./RunDetailView";
import { RunStatusBadge } from "./RunStatusBadge";
import { ShareResultDialog } from "./ShareResultDialog";
import type { RunDetailState } from "./useRunDetail";
import { useAuth } from "@/store/auth-provider";

const SCENE_TITLES: Record<ImagerySensor, string> = {
  sentinel2: "Sentinel-2 L2A",
  landsat: "Landsat Collection 2 L2",
};

function noSceneMessage(kind: ImagerySensor, search: SceneSearch | undefined) {
  const window = search ? `in the last ${search.lookback_days} days` : "in the search window";
  return kind === "sentinel2"
    ? `No acceptable Sentinel-2 scene found ${window}${search ? ` (cloud cover under ${search.max_cloud}%)` : ""}.`
    : `No Landsat 8 or 9 scene found ${window}.`;
}

/** "Landsat 9" from a Collection 2 id such as "LC09_L2SP_142040_20260918_02_T1". */
function landsatPlatform(itemId: string | null) {
  const match = itemId?.match(/^L[CO]0?(\d)_/);
  return match ? `Landsat ${match[1]}` : null;
}

export function Switch({
  checked,
  description,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  description?: React.ReactNode;
  disabled?: boolean;
  label: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      aria-checked={checked}
      className="group flex w-full items-start gap-3 rounded-md px-1 py-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      role="switch"
      type="button"
    >
      <span
        aria-hidden="true"
        className={cn(
          "relative mt-0.5 inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-150",
          checked ? "bg-teal-700" : "bg-slate-300",
        )}
      >
        <span
          className={cn(
            "absolute left-0.5 top-0.5 size-4 rounded-full bg-white shadow transition-transform duration-150 motion-reduce:transition-none",
            checked && "translate-x-4",
          )}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-slate-900">{label}</span>
        {description ? <span className="block text-xs text-slate-500">{description}</span> : null}
      </span>
    </button>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <Button
      aria-label={copied ? "Copied" : "Copy scene ID"}
      onClick={() => {
        void navigator.clipboard?.writeText(value).then(() => {
          setCopied(true);
          window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => setCopied(false), 1500);
        });
      }}
      size="icon-xs"
      title={copied ? "Copied" : "Copy scene ID"}
      type="button"
      variant="ghost"
    >
      {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
    </Button>
  );
}

function SceneCard({
  kind,
  pending,
  scene,
  search,
}: {
  kind: ImagerySensor;
  pending: boolean;
  scene: SceneInfo;
  /** The run's scene search, so the copy states what that run actually searched. */
  search: SceneSearch | undefined;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-950">
        <Satellite aria-hidden="true" className="size-4 text-slate-500" />
        {SCENE_TITLES[kind]}
      </h3>
      {scene.datetime || scene.item_id ? (
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          {kind === "landsat" && landsatPlatform(scene.item_id) ? (
            <>
              <dt className="text-slate-500">Satellite</dt>
              <dd className="text-xs leading-5 text-slate-800">{landsatPlatform(scene.item_id)}</dd>
            </>
          ) : null}
          <dt className="text-slate-500">Acquired</dt>
          <dd className="font-mono text-xs tabular-nums leading-5 text-slate-800">{formatUtc(scene.datetime)}</dd>
          {typeof scene.cloud_cover === "number" ? (
            <>
              <dt className="text-slate-500">Cloud cover</dt>
              <dd className="flex items-center gap-1 font-mono text-xs tabular-nums leading-5 text-slate-800">
                <Cloud aria-hidden="true" className="size-3.5 text-slate-400" />
                {scene.cloud_cover.toFixed(1)}%
              </dd>
            </>
          ) : null}
          {scene.item_id ? (
            <>
              <dt className="text-slate-500">Scene ID</dt>
              <dd className="flex items-start gap-1">
                <span className="min-w-0 break-all font-mono text-xs leading-5 text-slate-800">{scene.item_id}</span>
                <CopyButton value={scene.item_id} />
              </dd>
            </>
          ) : null}
        </dl>
      ) : (
        <p className="mt-2 text-xs text-slate-500">{pending ? "Waiting for this step to run…" : noSceneMessage(kind, search)}</p>
      )}
      {kind === "landsat" && search && typeof scene.cloud_cover === "number" && scene.cloud_cover >= search.max_cloud ? (
        <p className="mt-2 rounded-md bg-amber-50 px-2 py-1.5 text-xs text-amber-800">
          No Landsat pass under {search.max_cloud}% cloud in the last {search.lookback_days} days, so this is the latest one available. Expect cloud in the image.
        </p>
      ) : null}
    </section>
  );
}

/** The chip over the map names the passes actually drawn, so it follows the slider. */
function hudText(
  result: ModelRunResultDetail,
  visibility: LayerVisibility,
  selected: Record<ImagerySensor, ImageryPass | null>,
) {
  const name = result.section_railway_id || result.section_label;
  const parts = [name];
  for (const sensor of IMAGERY_SENSORS) {
    const pass = selected[sensor];
    if (visibility[sensor] && pass) {
      parts.push(`${SENSOR_LABELS[sensor]} ${formatDate(pass.datetime)}`);
    }
  }
  return parts.join(" · ");
}

export function SectionResultViewer({
  detail,
  runId,
  sectionId,
}: {
  detail: RunDetailState;
  runId: number;
  sectionId: number;
}) {
  const { loading, notFound, run } = detail;
  const product = useModelProduct();
  const { primaryLayer, resultsHref, viewer } = product;
  const { isAuthenticated } = useAuth();
  // Field supervisors receive shared results; the people who run models share
  // them. Sharing happens inside one company, so a LeafSat system admin has
  // nobody to share with and the API refuses them.
  const { isClientSuperAdmin, isEngineer, isFieldSupervisor } = useAuthUser({ enabled: isAuthenticated });
  const canShare = isClientSuperAdmin || isEngineer;
  const [visibility, setVisibility] = useState<LayerVisibility>({
    forecast: true,
    landsat: false,
    outline: true,
    readiness: true,
    sentinel2: false,
  });
  const [opacity, setOpacity] = useState(75);
  const [zoomNonce, setZoomNonce] = useState(0);
  // Where each sensor's slider is parked, and which result that was parked on.
  //
  // Null — including the null a stale result id reads as — means "whatever the
  // newest pass is". So the map opens on the same image the singular scene
  // keys have always shown; a run that is still finding passes keeps moving
  // forward with them rather than freezing on whichever pass was last when the
  // page first painted; and walking to the next section starts on its own
  // newest pass instead of inheriting an index that means a different date
  // there. Visibility and opacity are settings and do follow you across
  // sections, which is why they are not kept here.
  const [passIndex, setPassIndex] = useState<{ landsat: number | null; result: number; sentinel2: number | null } | null>(
    null,
  );
  const [scrubbed, setScrubbed] = useState<ImagerySensor>("sentinel2");

  const results = run?.results ?? [];
  const index = results.findIndex((item) => item.section === sectionId);
  const result = index >= 0 ? results[index] : null;
  const previous = index > 0 ? results[index - 1] : null;
  const next = index >= 0 && index < results.length - 1 ? results[index + 1] : null;
  const resultId = result?.id ?? null;

  // A field supervisor opening a map that was shared with them — from the
  // Shared page, the notification or the email — counts as having seen it.
  useEffect(() => {
    if (isFieldSupervisor && resultId !== null) {
      void markSharedResultViewedFor(resultId).catch(() => undefined);
    }
  }, [isFieldSupervisor, resultId]);

  if (loading || (!run && !notFound && !detail.error)) {
    return (
      <div className="p-4 sm:p-6">
        <h1 className="sr-only" id={RESULTS_HEADING_ID} tabIndex={-1}>
          Loading section result
        </h1>
        <p aria-busy="true" className="rounded-lg border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-500">
          Loading section result…
        </p>
      </div>
    );
  }

  if (!run || !result) {
    return (
      <div className="grid gap-4 p-4 sm:p-6">
        <h1 className="sr-only" id={RESULTS_HEADING_ID} tabIndex={-1}>
          Section result not found
        </h1>
        <IconEmptyState
          action={
            <Link className={buttonVariants({ variant: "outline" })} href={run ? resultsHref({ run: runId }) : resultsHref({})}>
              {run ? `Back to run #${runId}` : "All runs"}
            </Link>
          }
          description={
            run
              ? "This section isn't part of this run."
              : detail.error && !notFound
                ? `We couldn't load this run. ${detail.error}`
                : "It may have been removed, or it belongs to another company."
          }
          icon={SearchX}
          title={run ? "Section not in this run" : "Run not found"}
        />
      </div>
    );
  }

  const pending = isActiveRunStatus(result.status);
  const failed = result.status === "failed";
  const primary = product.primaryInfo(result);
  // Failed rows keep the backend's default synthetic flag; only a finished map is synthetic or not.
  const synthetic = result.status === "succeeded" && (result.is_synthetic || primary.is_synthetic);
  const model = result.status === "succeeded" ? (result.readiness?.model ?? null) : null;
  const targetDate = viewer.targetDate?.(result, run) ?? null;
  const timelines: Record<ImagerySensor, ImageryTimeline> = {
    landsat: imageryTimeline(result, "landsat"),
    sentinel2: imageryTimeline(result, "sentinel2"),
  };
  const passAt = (sensor: ImagerySensor) => {
    const count = timelines[sensor].passes.length;
    const chosen = passIndex?.result === result.id ? passIndex[sensor] : null;
    return chosen === null ? count - 1 : Math.min(Math.max(chosen, 0), count - 1);
  };
  const selectedPass: Record<ImagerySensor, ImageryPass | null> = {
    landsat: timelines.landsat.passes[passAt("landsat")] ?? null,
    sentinel2: timelines.sentinel2.passes[passAt("sentinel2")] ?? null,
  };

  // Readiness: its raster plus the two imagery layers, each showing the pass
  // the slider is parked on. Forecast: its raster only.
  const wms: Record<WmsLayerKind, WmsLayerInfo | null> = viewer.hasImagery
    ? {
        forecast: null,
        landsat: selectedPass.landsat?.wms ?? null,
        readiness: result.readiness.wms,
        sentinel2: selectedPass.sentinel2?.wms ?? null,
      }
    : { forecast: null, landsat: null, readiness: null, sentinel2: null, [primaryLayer]: primary.wms };
  const primaryOn = visibility[primaryLayer] && Boolean(wms[primaryLayer]);
  const setLayer = (key: keyof LayerVisibility) => (value: boolean) =>
    setVisibility((current) => ({ ...current, [key]: value }));
  const title = result.section_railway_id || result.section_label || `Section #${result.section}`;
  // The slider drives whichever imagery layer is actually on. With both on,
  // the segmented control decides; with a single pass there is nothing to
  // scrub, so that sensor is not offered and the control disappears entirely.
  const scrubbable = IMAGERY_SENSORS.filter((sensor) => visibility[sensor] && timelines[sensor].passes.length > 1);
  const scrubSensor = scrubbable.includes(scrubbed) ? scrubbed : (scrubbable[0] ?? null);

  const legend = (
    <ReadinessLegend
      dimmed={!primaryOn}
      isSynthetic={synthetic}
      targetDate={targetDate}
      valueMax={primary.value_max}
      valueMin={primary.value_min}
    />
  );

  return (
    <div className="min-h-[calc(100vh-2rem)] lg:h-[calc(100dvh-0.3rem)] lg:min-h-0 lg:overflow-hidden lg:px-4 lg:py-4">
      <div className="grid gap-4 p-3 lg:h-full lg:grid-cols-[380px_minmax(0,1fr)] lg:p-0">
        {/* Info panel (below the map on mobile) */}
        <div className="order-2 flex flex-col rounded-lg border border-slate-200 bg-white shadow-sm lg:order-1 lg:min-h-0 lg:overflow-hidden">
          <div className="space-y-3 border-b border-slate-200 p-5">
            <div className="flex items-center justify-between gap-2">
              <Link
                className={buttonVariants({ className: "-ml-2 text-slate-600", size: "sm", variant: "ghost" })}
                href={resultsHref({ run: runId })}
              >
                <ArrowLeft aria-hidden="true" />
                Run #{runId}
              </Link>
              {canShare ? (
                <ShareResultDialog
                  disabled={result.status !== "succeeded"}
                  key={result.id}
                  resultId={result.id}
                  runId={runId}
                  sectionName={title}
                />
              ) : null}
            </div>
            <div>
              <h1
                className="text-2xl font-bold tracking-tight text-slate-950 outline-none"
                id={RESULTS_HEADING_ID}
                tabIndex={-1}
              >
                {title}
                {result.section_railway_name ? (
                  <span className="font-normal text-slate-500"> · {result.section_railway_name}</span>
                ) : null}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {result.section_start_name && result.section_end_name ? (
                  <p className="text-sm text-slate-600">
                    {result.section_start_name} <span aria-hidden="true">→</span>
                    <span className="sr-only"> to </span> {result.section_end_name}
                  </p>
                ) : null}
                <span aria-live="polite">
                  <RunStatusBadge size="sm" status={result.status} />
                </span>
              </div>
            </div>
            {results.length > 1 ? (
              <nav aria-label="Sections in this run" className="flex items-center justify-between gap-2">
                {previous ? (
                  <Link
                    className={buttonVariants({ size: "sm", variant: "outline" })}
                    href={resultsHref({ run: runId, section: previous.section })}
                  >
                    <ChevronLeft aria-hidden="true" />
                    Previous section
                  </Link>
                ) : (
                  <span />
                )}
                <span className="text-xs tabular-nums text-slate-500">
                  {index + 1} of {results.length}
                </span>
                {next ? (
                  <Link
                    className={buttonVariants({ size: "sm", variant: "outline" })}
                    href={resultsHref({ run: runId, section: next.section })}
                  >
                    Next section
                    <ChevronRight aria-hidden="true" />
                  </Link>
                ) : (
                  <span />
                )}
              </nav>
            ) : null}
          </div>

          <div className="flex-1 space-y-5 p-5 lg:min-h-0 lg:overflow-y-auto">
            {synthetic ? <SyntheticNotice /> : null}
            {model && !model.calibrated ? <UncalibratedModelNotice /> : null}
            {model ? <ReadinessModelCard model={model} /> : null}

            {failed ? (
              <Alert className="flex gap-2" role="alert" variant="destructive">
                <XCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <div>
                  <p className="font-semibold">This section couldn&apos;t be processed.</p>
                  {result.error_message ? (
                    <p className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap break-words font-mono text-xs">
                      {result.error_message}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs">Other sections in this run are unaffected.</p>
                </div>
              </Alert>
            ) : null}
            {pending ? (
              <Alert>This section is still being processed. Layers appear here as each step finishes.</Alert>
            ) : null}

            <section aria-labelledby="layers-heading" className="space-y-1">
              <h2 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500" id="layers-heading">
                Layers
              </h2>
              <Switch
                checked={primaryOn}
                description={wms[primaryLayer] ? viewer.layerDescription(targetDate) : "Not available for this section"}
                disabled={!wms[primaryLayer]}
                label={viewer.layerLabel}
                onChange={setLayer(primaryLayer)}
              />
              <div className={cn("flex items-center gap-3 pb-2 pl-12 pr-1", !primaryOn && "opacity-50")}>
                <label className="text-xs text-slate-600" htmlFor="readiness-opacity">
                  Opacity
                </label>
                <input
                  aria-valuetext={`${opacity} percent`}
                  className="h-1.5 w-full cursor-pointer accent-teal-700 disabled:cursor-not-allowed"
                  disabled={!primaryOn}
                  id="readiness-opacity"
                  max={100}
                  min={0}
                  onChange={(event) => setOpacity(Number(event.target.value))}
                  step={5}
                  type="range"
                  value={opacity}
                />
                <span className="w-10 text-right font-mono text-xs tabular-nums text-slate-600">{opacity}%</span>
              </div>
              {viewer.hasImagery ? (
                <>
                  {IMAGERY_SENSORS.map((sensor) => {
                    const pass = selectedPass[sensor];
                    const count = timelines[sensor].passes.length;
                    return (
                      <Switch
                        checked={visibility[sensor] && Boolean(wms[sensor])}
                        description={
                          pass
                            ? `True colour · ${formatDate(pass.datetime)}${count > 1 ? ` · ${pluralize(count, "pass", "passes")}` : ""}`
                            : result[sensor].datetime
                              ? "Image not published yet"
                              : "No scene available"
                        }
                        disabled={!wms[sensor]}
                        key={sensor}
                        label={`${SENSOR_LABELS[sensor]} true colour`}
                        onChange={setLayer(sensor)}
                      />
                    );
                  })}
                  {scrubSensor ? (
                    <ImageryTimelineControl
                      index={passAt(scrubSensor)}
                      key={scrubSensor}
                      onIndexChange={(next) =>
                        setPassIndex((current) => ({
                          ...(current?.result === result.id ? current : { landsat: null, result: result.id, sentinel2: null }),
                          [scrubSensor]: next,
                        }))
                      }
                      onSensorChange={setScrubbed}
                      sensor={scrubSensor}
                      sensors={scrubbable}
                      timeline={timelines[scrubSensor]}
                    />
                  ) : null}
                </>
              ) : null}
              <Switch checked={visibility.outline} label="Section outline" onChange={setLayer("outline")} />
              <div className="pt-2">
                <Button onClick={() => setZoomNonce((value) => value + 1)} size="sm" type="button" variant="outline">
                  <Crosshair aria-hidden="true" />
                  Zoom to section
                </Button>
              </div>
            </section>

            {/* On small screens the legend lives here rather than covering the map. */}
            <div className="rounded-lg border border-slate-200 p-3 lg:hidden">{legend}</div>

            {viewer.details ? (
              viewer.details(result, run)
            ) : (
              <>
                <section aria-labelledby="scenes-heading" className="space-y-3">
                  <h2 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500" id="scenes-heading">
                    Scenes
                  </h2>
                  <SceneCard kind="sentinel2" pending={pending} scene={result.sentinel2} search={run?.scene_search ?? undefined} />
                  <SceneCard kind="landsat" pending={pending} scene={result.landsat} search={run?.scene_search ?? undefined} />
                </section>

                <section aria-labelledby="raster-heading" className="space-y-1.5">
                  <h2 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500" id="raster-heading">
                    Readiness raster
                  </h2>
                  <p className="text-sm text-slate-600">
                    {typeof result.readiness.value_min === "number" && typeof result.readiness.value_max === "number" ? (
                      <>
                        Range{" "}
                        <span className="font-mono tabular-nums text-slate-800">
                          {result.readiness.value_min.toFixed(2)} – {result.readiness.value_max.toFixed(2)}
                        </span>{" "}
                        · 10 m resolution
                      </>
                    ) : pending ? (
                      "Not produced yet."
                    ) : (
                      "No readiness raster for this section."
                    )}
                  </p>
                  <p className="text-xs text-slate-500">{result.readiness.value_semantics}</p>
                </section>
              </>
            )}
          </div>
        </div>

        {/* Map (first on mobile) */}
        <section className="order-1 h-[55dvh] min-h-[22rem] overflow-hidden rounded-lg border border-slate-200 bg-slate-900 shadow-sm lg:order-2 lg:h-full lg:min-h-0">
          <ReadinessResultMap
            bbox={result.bbox}
            className="h-full w-full"
            failed={failed}
            hudLabel={viewer.hudLabel ? viewer.hudLabel(result, run) : hudText(result, visibility, selectedPass)}
            isSynthetic={synthetic}
            label={title}
            legend={legend}
            opacity={opacity / 100}
            outline={result.section_polygon}
            visibility={{
              forecast: visibility.forecast && Boolean(wms.forecast),
              landsat: visibility.landsat && Boolean(wms.landsat),
              outline: visibility.outline,
              readiness: visibility.readiness && Boolean(wms.readiness),
              sentinel2: visibility.sentinel2 && Boolean(wms.sentinel2),
            }}
            wms={wms}
            zoomNonce={zoomNonce}
          />
        </section>
      </div>
    </div>
  );
}

/** What the Biological Readiness Index used for this section, so a map can be judged by its inputs. */
function ReadinessModelCard({ model }: { model: ReadinessModelInfo }) {
  const rows: Array<[string, string]> = [
    ["Readiness on", model.target_date],
    ["Temperature to", model.temperature_last_day_used ?? "—"],
    [
      "Sentinel-2",
      model.sentinel2_last_date
        ? `${model.sentinel2_current_dates_count} dates this season, latest ${model.sentinel2_last_date}`
        : "No clear dates this season",
    ],
    [
      "Broadleaf area",
      model.broadleaf_pixel_count != null
        ? `${((model.broadleaf_pixel_count * 100) / 1_000_000).toFixed(2)} km² (${model.broadleaf_pixel_count.toLocaleString()} px)`
        : "—",
    ],
  ];
  return (
    <section className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <h3 className="text-sm font-semibold text-slate-950">
        {model.label} <span className="font-normal text-slate-500">· v{model.version}</span>
      </h3>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        {rows.map(([label, value]) => (
          <Fragment key={label}>
            <dt className="text-slate-500">{label}</dt>
            <dd className="text-xs leading-5 text-slate-800">{value}</dd>
          </Fragment>
        ))}
      </dl>
      {model.warnings.length > 0 ? (
        <ul className="mt-2 space-y-1 text-xs text-amber-800">
          {model.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
