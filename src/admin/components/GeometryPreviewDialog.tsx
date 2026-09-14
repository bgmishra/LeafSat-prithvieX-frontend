"use client";

import type { ResourceConfig } from "@/admin/types/resources";
import { GeoJsonMapPreview } from "./GeoJsonMapPreview";

function fieldValue(item: Record<string, unknown>, key: string) {
  const value = item[key];
  return value == null || value === "" ? "-" : String(value);
}

export function GeometryPreviewDialog({
  config,
  item,
  onClose,
  open,
}: {
  config: ResourceConfig;
  item: Record<string, unknown> | null;
  onClose: () => void;
  open: boolean;
}) {
  if (!open || !item || !config.geometryPreview) {
    return null;
  }

  const geometryPreview = config.geometryPreview;
  const geometry = item[geometryPreview.field];
  const infoFields = config.fields.filter(
    (field) => field.type !== "file" && field.name !== geometryPreview.field,
  );

  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-slate-950/50">
      <div className="h-full w-full max-w-2xl overflow-y-auto bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">{geometryPreview.label || `${config.title} Boundary`}</h2>
            <p className="mt-1 text-sm text-slate-500">Geographic boundary for the selected record.</p>
          </div>
          <button className="rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100" onClick={onClose} type="button">
            Close
          </button>
        </div>

        {infoFields.length > 0 ? (
          <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm sm:grid-cols-2">
            {infoFields.map((field) => (
              <div key={field.name}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{field.label}</dt>
                <dd className="mt-0.5 text-slate-800">{fieldValue(item, field.name)}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        <div className="mt-5">
          <GeoJsonMapPreview geometry={geometry} />
        </div>
      </div>
    </div>
  );
}
