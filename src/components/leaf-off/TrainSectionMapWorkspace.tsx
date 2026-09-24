"use client";

import { useEffect, useMemo, useState } from "react";
import { getErrorMessage } from "@/api/client";
import { GeoJsonMapPreview } from "@/admin/components/GeoJsonMapPreview";
import { Alert } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Select, SelectOption } from "@/components/ui/select";
import { listSections, type RailwaySection } from "@/lib/sections";

type RailwaySegment = RailwaySection;

function segmentLabel(segment: RailwaySegment) {
  const name = segment.railway_name || segment.railway_id || `Section #${segment.id}`;
  const from = segment.section_start_name;
  const to = segment.section_end_name;

  return from && to ? `${name} (${from} → ${to})` : name;
}

/**
 * Shared two-panel layout for the leaf-off tool pages: a train-section picker on
 * the left, and a map of the selected section's boundary on the right. `children`
 * renders any additional configuration fields below the section picker.
 */
export function TrainSectionMapWorkspace({
  children,
  description,
  onSegmentChange,
  title,
}: {
  children?: (selectedSegment: RailwaySegment | null) => React.ReactNode;
  description: string;
  onSegmentChange?: (selectedSegment: RailwaySegment | null) => void;
  title: string;
}) {
  const [segments, setSegments] = useState<RailwaySegment[]>([]);
  const [loadingSegments, setLoadingSegments] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedSegmentId, setSelectedSegmentId] = useState("");

  useEffect(() => {
    let active = true;

    listSections("approved")
      .then((approvedSections) => {
        if (active) {
          setSegments(approvedSections);
        }
      })
      .catch((caught) => {
        if (active) {
          setLoadError(getErrorMessage(caught));
        }
      })
      .finally(() => {
        if (active) {
          setLoadingSegments(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const selectedSegment = useMemo(
    () => segments.find((segment) => String(segment.id) === selectedSegmentId) ?? null,
    [segments, selectedSegmentId],
  );

  useEffect(() => {
    onSegmentChange?.(selectedSegment);
  }, [onSegmentChange, selectedSegment]);

  return (
    <div className="min-h-[calc(100vh-2rem)] overflow-visible lg:h-[calc(100dvh-0.3rem)] lg:min-h-0 lg:overflow-hidden lg:px-4 lg:py-4">
      <div className="grid min-h-full gap-4 lg:h-full lg:grid-cols-[400px_minmax(0,1fr)]">
        <div className="flex flex-col rounded-lg border border-slate-200 bg-white shadow-sm lg:min-h-0 lg:overflow-hidden">
          <div className="border-b border-slate-200 p-5">
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{title}</h1>
            <p className="mt-2 text-sm text-slate-500">{description}</p>
          </div>

          {loadError ? (
            <div className="border-b border-slate-200 bg-white px-5 py-3">
              <Alert variant="destructive">{loadError}</Alert>
            </div>
          ) : null}

          <div className="flex-1 space-y-5 overflow-visible p-5 lg:min-h-0 lg:overflow-y-auto">
            <label className="block">
              <Label className="font-semibold">Train section</Label>
              <Select
                className="mt-2"
                disabled={loadingSegments}
                onChange={(event) => setSelectedSegmentId(event.target.value)}
                value={selectedSegmentId}
              >
                <SelectOption value="">{loadingSegments ? "Loading train sections..." : "Select a train section"}</SelectOption>
                {segments.map((segment) => (
                  <SelectOption key={segment.id} value={String(segment.id)}>
                    {segmentLabel(segment)}
                  </SelectOption>
                ))}
              </Select>
              {!loadingSegments && segments.length === 0 ? (
                <p className="mt-1 text-xs text-slate-500">
                  No approved train sections are available yet. Add and approve a section from the Manage Sections page.
                </p>
              ) : null}
            </label>

            {children ? children(selectedSegment) : null}
          </div>
        </div>

        <section className="relative min-h-[26rem] overflow-hidden rounded-lg border border-slate-200 bg-slate-900 shadow-sm lg:h-full">
          <GeoJsonMapPreview
            className="h-full min-h-[26rem] w-full lg:min-h-0"
            geometry={selectedSegment?.section_polygon ?? null}
          />
        </section>
      </div>
    </div>
  );
}
