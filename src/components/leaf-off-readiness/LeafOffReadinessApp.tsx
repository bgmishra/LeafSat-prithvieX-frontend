"use client";

import { TrainSectionMapWorkspace } from "@/components/leaf-off/TrainSectionMapWorkspace";

export function LeafOffReadinessApp() {
  return (
    <TrainSectionMapWorkspace
      description="Check whether a train section is ready for a leaf-off vegetation survey."
      title="Leaf-Off Readiness Configuration"
    />
  );
}
