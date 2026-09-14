"use client";

import { useMemo, useState } from "react";
import type { ResourceConfig } from "@/admin/types/resources";

export function DataTable({
  canDelete,
  canEdit,
  canView,
  config,
  items,
  loading,
  onDelete,
  onEdit,
  onView,
}: {
  canDelete: (item: Record<string, unknown>) => boolean;
  canEdit: (item: Record<string, unknown>) => boolean;
  canView?: (item: Record<string, unknown>) => boolean;
  config: ResourceConfig;
  items: Record<string, unknown>[];
  loading: boolean;
  onDelete: (item: Record<string, unknown>) => void;
  onEdit: (item: Record<string, unknown>) => void;
  onView?: (item: Record<string, unknown>) => void;
}) {
  const [search, setSearch] = useState("");
  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return items;
    }

    return items.filter((item) => JSON.stringify(item).toLowerCase().includes(query));
  }, [items, search]);

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
        <input
          className="min-h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 sm:max-w-sm"
          onChange={(event) => setSearch(event.target.value)}
          placeholder={`Search ${config.title.toLowerCase()}...`}
          value={search}
        />
        <p className="text-sm text-slate-500">{filteredItems.length} records</p>
      </div>

      {loading ? (
        <div className="p-8 text-center text-sm text-slate-500">Loading {config.title.toLowerCase()}...</div>
      ) : filteredItems.length === 0 ? (
        <div className="p-8 text-center">
          <h3 className="text-base font-semibold text-slate-950">No records found</h3>
          <p className="mt-1 text-sm text-slate-500">Create a new record or adjust your search.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {config.columns.map((column) => (
                  <th className="px-4 py-3 font-semibold" key={column.key}>
                    {column.label}
                  </th>
                ))}
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item) => {
                const id = String(item[config.idKey || "id"] ?? JSON.stringify(item));

                return (
                  <tr className="hover:bg-slate-50" key={id}>
                    {config.columns.map((column) => (
                      <td className="max-w-xs px-4 py-3 text-slate-700" key={column.key}>
                        {column.render ? column.render(item) : String(item[column.key] ?? "-")}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {onView && canView?.(item) ? (
                          <button
                            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-white"
                            onClick={() => onView(item)}
                            type="button"
                          >
                            View
                          </button>
                        ) : null}
                        {canEdit(item) ? (
                          <button
                            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-white"
                            onClick={() => onEdit(item)}
                            type="button"
                          >
                            Edit
                          </button>
                        ) : null}
                        {canDelete(item) ? (
                          <button
                            className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50"
                            onClick={() => onDelete(item)}
                            type="button"
                          >
                            Delete
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
