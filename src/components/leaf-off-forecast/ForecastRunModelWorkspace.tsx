"use client";

import { useEffect, useState } from "react";
import { CalendarClock } from "lucide-react";
import { LeafOffRunModelWorkspace } from "@/components/leaf-off-readiness/LeafOffRunModelWorkspace";
import { FALLBACK_FORECAST_OPTIONS, getForecastOptions, type ForecastOptions } from "@/lib/model-runs";
import { useAuth } from "@/store/auth-provider";
import { formatHorizon, formatTargetWeekday, targetDateFor } from "./forecast-dates";
import { HorizonControl } from "./HorizonControl";

/**
 * Run Forecast Model: the shared section picker plus a horizon choice. The
 * horizon feeds the page, the confirm dialog and `forecast_horizon_days` on create.
 */
export function ForecastRunModelWorkspace() {
  const { isAuthenticated, isReady } = useAuth();
  const [options, setOptions] = useState<ForecastOptions>(FALLBACK_FORECAST_OPTIONS);
  // null until the user picks one, so a server default that arrives late still applies.
  const [picked, setPicked] = useState<number | null>(null);

  useEffect(() => {
    if (!isReady || !isAuthenticated) {
      return;
    }
    let active = true;
    getForecastOptions()
      .then((next) => {
        if (active && Array.isArray(next.horizons) && next.horizons.length > 0) {
          setOptions(next);
        }
      })
      // The fallback mirrors the server's choices, so the page still works.
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [isAuthenticated, isReady]);

  const fallback = options.horizons.includes(options.default_horizon) ? options.default_horizon : options.horizons[0];
  const horizon = picked !== null && options.horizons.includes(picked) ? picked : fallback;
  const target = targetDateFor(horizon);

  return (
    <LeafOffRunModelWorkspace
      extension={{
        confirmSummary: (
          <p className="flex items-center gap-2.5 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2.5 text-sm text-teal-950">
            <CalendarClock aria-hidden="true" className="size-4 shrink-0 text-teal-700" />
            <span>
              Forecast for{" "}
              <time className="font-mono font-semibold tabular-nums" dateTime={target}>
                {target}
              </time>{" "}
              ({formatHorizon(horizon)})
              <span className="text-teal-800/80"> · {formatTargetWeekday(target)}</span>
            </span>
          </p>
        ),
        controls: <HorizonControl horizons={options.horizons} onChange={setPicked} value={horizon} />,
        createOptions: { forecastHorizonDays: horizon },
      }}
    />
  );
}
