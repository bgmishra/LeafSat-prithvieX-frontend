"use client";

import { TrainSectionMapWorkspace } from "@/components/leaf-off/TrainSectionMapWorkspace";

export function LeafOffForecastApp() {
  return (
    <TrainSectionMapWorkspace
      description="Forecast when a train section is expected to reach leaf-off conditions."
      title="Leaf-Off Forecast Configuration"
    />
  );
}
