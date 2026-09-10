"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Edit3, FilePlus2, Plus, Search } from "lucide-react";
import { useApiClient } from "@/admin/hooks/useApiClient";
import type { ServiceDetailPage, ServicePageListItem } from "@/lib/service-pages";

type AdminPageRow =
  | ({ row_type: "page" } & ServiceDetailPage)
  | ({ row_type: "service" } & ServicePageListItem);

function statusClasses(status?: ServicePageListItem["status"]) {
  if (status === "published") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "draft") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
}

function statusLabel(status?: ServicePageListItem["status"]) {
  if (status === "not_created") {
    return "Not Created";
  }

  return status === "published" ? "Published" : "Draft";
}

function pageEditHref(item: ServiceDetailPage) {
  return item.service?.id ? "/admin/service-pages/" + item.service.id + "/edit" : "/admin/service-pages/pages/" + item.id + "/edit";
}

function pageTypeLabel(item: AdminPageRow) {
  if (item.row_type === "service") {
    return "Service";
  }

  return item.service ? "Service" : "Custom";
}

export default function AdminServicePagesPage() {
  const { request } = useApiClient();
  const [items, setItems] = useState<AdminPageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadServicePages() {
      setLoading(true);
      setError("");
      try {
        const [pages, services] = await Promise.all([
          request<ServiceDetailPage[]>("/api/v1/admin/service-pages/pages/"),
          request<ServicePageListItem[]>("/api/v1/admin/service-pages/"),
        ]);
        if (!cancelled) {
          const createdServiceIds = new Set(pages.map((page) => page.service?.id).filter(Boolean));
          const uncreatedServices = services
            .filter((item) => item.status === "not_created" && !createdServiceIds.has(item.id))
            .map((item) => ({ ...item, row_type: "service" as const }));
          setItems([...pages.map((page) => ({ ...page, row_type: "page" as const })), ...uncreatedServices]);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Unable to load pages.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadServicePages();

    return () => {
      cancelled = true;
    };
  }, [request]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return items;
    }

    return items.filter((item) => {
      const values = item.row_type === "page"
        ? [item.title, item.slug, item.service?.name_label ?? item.service?.name, item.service?.service_category, pageTypeLabel(item)]
        : [item.name_label ?? item.name, item.service_category, item.page_title, item.slug, pageTypeLabel(item)];
      return values.filter(Boolean).some((value) => String(value).toLowerCase().includes(normalizedQuery));
    });
  }, [items, query]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">Pages CMS</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Pages</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Create, edit, preview, and publish Markdown pages for services, blogs, and custom public slugs.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <Link
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white transition hover:bg-teal-800"
            href="/admin/service-pages/new"
          >
            <Plus className="h-4 w-4" />
            Create Page
          </Link>
          <label className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="min-h-11 w-full rounded-md border border-slate-300 bg-white pl-10 pr-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search pages"
              value={query}
            />
          </label>
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Page</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={5}>
                    Loading pages...
                  </td>
                </tr>
              ) : null}
              {!loading && filteredItems.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={5}>
                    No pages found.
                  </td>
                </tr>
              ) : null}
              {filteredItems.map((item) => {
                const created = item.row_type === "page";
                const Icon = created ? Edit3 : FilePlus2;
                const title = item.row_type === "page" ? item.title || "Untitled page" : item.name_label ?? item.name;
                const slug = item.row_type === "page" ? item.slug : item.slug;
                const serviceName = item.row_type === "page" ? item.service?.name_label ?? item.service?.name : item.name_label ?? item.name;
                const serviceCategory = item.row_type === "page" ? item.service?.service_category : item.service_category;
                const href = item.row_type === "page" ? pageEditHref(item) : "/admin/service-pages/" + item.id + "/edit";

                return (
                  <tr className="align-top" key={item.row_type + "-" + item.id}>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-950">{title}</p>
                      {slug ? <p className="mt-1 text-xs text-slate-500">/{slug}</p> : null}
                    </td>
                    <td className="px-4 py-4 text-slate-600">{pageTypeLabel(item)}</td>
                    <td className="px-4 py-4 text-slate-600">
                      {serviceName || "-"}
                      {serviceCategory ? <p className="mt-1 text-xs text-slate-500">{serviceCategory}</p> : null}
                    </td>
                    <td className="px-4 py-4">
                      <span className={"inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold " + statusClasses(item.status)}>
                        {statusLabel(item.status)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Link
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white transition hover:bg-teal-800"
                        href={href}
                      >
                        <Icon className="h-4 w-4" />
                        {created ? "Edit Page" : "Create Page"}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
