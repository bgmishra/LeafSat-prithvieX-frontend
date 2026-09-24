"use client";

import { useId } from "react";
import { CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatHorizon, formatTargetWeekday, targetDateFor } from "./forecast-dates";

/**
 * Forecast horizon as a segmented control. Built on native radio inputs, so
 * it is one tab stop, arrow keys move the choice, and screen readers announce
 * "radio, 2 of 4". The computed target date sits right under it.
 */
export function HorizonControl({
  disabled,
  horizons,
  onChange,
  value,
}: {
  disabled?: boolean;
  horizons: number[];
  onChange: (days: number) => void;
  value: number;
}) {
  const name = useId();
  const labelId = `${name}-label`;
  const targetId = `${name}-target`;
  const target = targetDateFor(value);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-800" id={labelId}>
        Forecast horizon
      </p>
      <div
        aria-describedby={targetId}
        aria-labelledby={labelId}
        className="grid rounded-lg bg-slate-100 p-1"
        role="radiogroup"
        style={{ gridTemplateColumns: `repeat(${horizons.length}, minmax(0, 1fr))` }}
      >
        {horizons.map((days) => {
          const checked = days === value;
          return (
            <label
              className={cn(
                "relative flex min-h-9 cursor-pointer items-center justify-center rounded-md px-2 text-sm font-semibold tabular-nums transition-colors duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-teal-600 motion-reduce:transition-none",
                checked ? "bg-white text-teal-800 shadow-sm ring-1 ring-slate-200" : "text-slate-600 hover:text-slate-900",
                disabled && "cursor-not-allowed opacity-60",
              )}
              key={days}
            >
              <input
                checked={checked}
                className="sr-only"
                disabled={disabled}
                name={name}
                onChange={() => onChange(days)}
                type="radio"
                value={days}
              />
              <span aria-hidden="true">+{days}</span>
              <span className="sr-only">{formatHorizon(days)}</span>
            </label>
          );
        })}
      </div>
      <p className="flex items-center gap-1.5 text-xs text-slate-600" id={targetId}>
        <CalendarClock aria-hidden="true" className="size-3.5 text-teal-700" />
        <span>
          Forecast for{" "}
          <time className="font-mono font-semibold tabular-nums text-slate-900" dateTime={target}>
            {target}
          </time>{" "}
          <span className="text-slate-500">
            ({formatTargetWeekday(target)} · {formatHorizon(value)})
          </span>
        </span>
      </p>
    </div>
  );
}
