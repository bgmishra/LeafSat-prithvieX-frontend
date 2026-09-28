"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { useReducedMotion } from "@/components/leaf-off/map-base-layers";
import { Button } from "@/components/ui/button";
import { formatDate, pluralize } from "@/lib/format";
import type { ImageryPass, ImagerySensor, ImageryTimeline } from "@/lib/model-runs";
import { cn } from "@/lib/utils";

/** How long one pass stays up while playing. Long enough to read the date under it. */
const PLAY_INTERVAL_MS = 1200;

export const SENSOR_LABELS: Record<ImagerySensor, string> = {
  sentinel2: "Sentinel-2",
  landsat: "Landsat",
};

/** "02 Sep": the ends of the axis only place the window, the caption carries the full date. */
function axisDate(value: string | null) {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}

function cloudText(pass: ImageryPass) {
  return typeof pass.cloud_cover === "number" ? `${Math.round(pass.cloud_cover)}% cloud` : "cloud cover unknown";
}

/**
 * Scrub one sensor's passes over a section.
 *
 * A readiness run images a section every time the satellite goes over, so the
 * one picture the model used sits in a month of others; this walks the map
 * through them. Sentinel-2 and Landsat revisit on their own cadences and their
 * passes almost never line up, so each sensor keeps its own axis and the
 * segmented control says which one the slider is driving — putting both on one
 * axis would invent dates neither satellite flew.
 *
 * The caller hides this when there is nothing to scrub; it also declines to
 * render a single pass itself, because a range input with one step is a
 * control that cannot be moved. The caller keys it by sensor, so switching
 * sensors remounts it and a run that was playing does not carry over onto an
 * axis with different dates on it.
 */
export function ImageryTimelineControl({
  index,
  onIndexChange,
  onSensorChange,
  sensor,
  sensors,
  timeline,
}: {
  /** Index into `timeline.passes`, oldest first. */
  index: number;
  onIndexChange: (index: number) => void;
  onSensorChange: (sensor: ImagerySensor) => void;
  /** The sensor the slider is driving right now. */
  sensor: ImagerySensor;
  /** Sensors the slider could drive: more than one raises the segmented control. */
  sensors: ImagerySensor[];
  timeline: ImageryTimeline;
}) {
  const group = useId();
  const sliderId = `${group}-slider`;
  const labelId = `${group}-label`;
  const [playing, setPlaying] = useState(false);
  // Nobody who has asked for less motion gets a button whose whole job is to
  // move the map on its own, so the control simply is not there for them.
  const canPlay = !useReducedMotion();

  // The play loop reads this rather than taking onIndexChange as a dependency:
  // a caller passing an inline arrow would otherwise rebuild the timer on every
  // render and the step would never come due.
  const stepRef = useRef(onIndexChange);
  useEffect(() => {
    stepRef.current = onIndexChange;
  });

  const passes = timeline.passes;
  const last = passes.length - 1;
  const current = passes[Math.min(Math.max(index, 0), last)];
  // Reaching the end stops the run without having to write it down: the button
  // goes back to offering Play, and pressing it there rewinds to the first pass
  // rather than sitting still.
  const atEnd = index >= last;
  const running = playing && !atEnd;

  useEffect(() => {
    if (!running) {
      return;
    }
    const timer = window.setTimeout(() => stepRef.current(index + 1), PLAY_INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [index, running]);

  const togglePlay = () => {
    if (running) {
      setPlaying(false);
      return;
    }
    if (atEnd) {
      onIndexChange(0);
    }
    setPlaying(true);
  };

  if (passes.length < 2 || !current) {
    return null;
  }

  const valueText = `${formatDate(current.datetime)}, ${cloudText(current)}, pass ${index + 1} of ${passes.length}`;

  return (
    <section
      aria-labelledby={labelId}
      className="mt-1 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500" id={labelId}>
          Imagery timeline
        </p>
        {sensors.length > 1 ? (
          <div aria-label="Sensor to scrub" className="flex rounded-lg bg-slate-200/70 p-0.5" role="radiogroup">
            {sensors.map((option) => (
              <label
                className={cn(
                  "cursor-pointer rounded-md px-2 py-0.5 text-[11px] font-semibold transition-colors duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-teal-600 motion-reduce:transition-none",
                  option === sensor ? "bg-white text-teal-800 shadow-sm ring-1 ring-slate-200" : "text-slate-600 hover:text-slate-900",
                )}
                key={option}
              >
                <input
                  checked={option === sensor}
                  className="sr-only"
                  name={group}
                  onChange={() => onSensorChange(option)}
                  type="radio"
                  value={option}
                />
                {SENSOR_LABELS[option]}
              </label>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          aria-label="Previous pass"
          disabled={index <= 0}
          onClick={() => onIndexChange(index - 1)}
          size="icon-xs"
          type="button"
          variant="ghost"
        >
          <ChevronLeft aria-hidden="true" />
        </Button>
        <span aria-hidden="true" className="shrink-0 font-mono text-[11px] tabular-nums text-slate-500">
          {axisDate(passes[0].datetime)}
        </span>
        <label className="sr-only" htmlFor={sliderId}>
          {SENSOR_LABELS[sensor]} pass
        </label>
        <input
          aria-valuetext={valueText}
          className="h-1.5 min-w-0 flex-1 cursor-pointer accent-teal-700"
          id={sliderId}
          max={last}
          min={0}
          onChange={(event) => onIndexChange(Number(event.target.value))}
          step={1}
          type="range"
          value={index}
        />
        <span aria-hidden="true" className="shrink-0 font-mono text-[11px] tabular-nums text-slate-500">
          {axisDate(passes[last].datetime)}
        </span>
        <Button
          aria-label="Next pass"
          disabled={index >= last}
          onClick={() => onIndexChange(index + 1)}
          size="icon-xs"
          type="button"
          variant="ghost"
        >
          <ChevronRight aria-hidden="true" />
        </Button>
        {canPlay ? (
          <Button
            aria-label={running ? "Pause the timeline" : "Play the timeline"}
            aria-pressed={running}
            onClick={togglePlay}
            size="icon-xs"
            type="button"
            variant="ghost"
          >
            {running ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
          </Button>
        ) : null}
      </div>

      <p className="text-xs text-slate-600">
        {SENSOR_LABELS[sensor]} ·{" "}
        <span className="font-mono tabular-nums text-slate-800">{formatDate(current.datetime)}</span> ·{" "}
        {cloudText(current)} · {pluralize(passes.length, "pass", "passes")}
        {timeline.pending > 0 ? ` · ${timeline.pending} not published yet` : null}
      </p>
    </section>
  );
}
