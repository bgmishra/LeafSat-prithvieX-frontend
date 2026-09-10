"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FilePlus2 } from "lucide-react";
import { useApiClient } from "@/admin/hooks/useApiClient";
import { useToast } from "@/admin/components/ToastProvider";
import type { ServiceDetailPage, ServicePageListItem } from "@/lib/service-pages";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function NewServicePage() {
  const { request } = useApiClient();
  const router = useRouter();
  const toast = useToast();
  const [items, setItems] = useState<ServicePageListItem[]>([]);
  const [mode, setMode] = useState<"custom" | "service">("custom");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [customSlug, setCustomSlug] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadServices() {
      setLoading(true);
      setError("");
      try {
        const response = await request<ServicePageListItem[]>("/api/v1/admin/service-pages/");
        if (!cancelled) {
          setItems(response);
          const firstDraftable = response.find((item) => item.status === "not_created") || response[0];
          setSelectedServiceId(firstDraftable ? String(firstDraftable.id) : "");
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Unable to load services.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadServices();

    return () => {
      cancelled = true;
    };
  }, [request]);

  const selectedService = useMemo(
    () => items.find((item) => String(item.id) === selectedServiceId),
    [items, selectedServiceId],
  );

  async function createCustomPage() {
    if (saving) {
      return;
    }

    setSaving(true);
    setError("");
    try {
      const response = await request<ServiceDetailPage>("/api/v1/admin/service-pages/pages/", {
        body: JSON.stringify({
          service_id: null,
          slug: customSlug || undefined,
          title: customTitle,
        }),
        method: "POST",
      });
      toast.notify({ title: "Custom page created.", type: "success" });
      router.push("/admin/service-pages/pages/" + response.id + "/edit");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unable to create custom page.";
      setError(message);
      toast.notify({ title: message, type: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link className="inline-flex items-center gap-2 text-sm font-semibold text-teal-700" href="/admin/service-pages">
          <ArrowLeft className="h-4 w-4" />
          Pages
        </Link>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">Pages CMS</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Create Page</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Create a service page or a custom page for any public slug such as blog, about, or help.
        </p>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="max-w-2xl rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        {loading ? (
          <p className="text-sm text-slate-500">Loading options...</p>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-2 rounded-md bg-slate-100 p-1">
              <button
                className={"min-h-10 rounded px-3 text-sm font-semibold transition " + (mode === "custom" ? "bg-white text-slate-950 shadow-sm" : "text-slate-600 hover:text-slate-950")}
                onClick={() => setMode("custom")}
                type="button"
              >
                Custom page
              </button>
              <button
                className={"min-h-10 rounded px-3 text-sm font-semibold transition " + (mode === "service" ? "bg-white text-slate-950 shadow-sm" : "text-slate-600 hover:text-slate-950")}
                onClick={() => setMode("service")}
                type="button"
              >
                Service page
              </button>
            </div>

            {mode === "custom" ? (
              <div className="space-y-4">
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  Page title
                  <input
                    className="min-h-11 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                    onBlur={() => !customSlug && setCustomSlug(slugify(customTitle))}
                    onChange={(event) => setCustomTitle(event.target.value)}
                    placeholder="Blog"
                    value={customTitle}
                  />
                </label>
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  Slug
                  <input
                    className="min-h-11 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                    onChange={(event) => setCustomSlug(slugify(event.target.value))}
                    placeholder="blog"
                    value={customSlug}
                  />
                </label>
                <button
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
                  disabled={saving || !customTitle.trim()}
                  onClick={createCustomPage}
                  type="button"
                >
                  <FilePlus2 className="h-4 w-4" />
                  {saving ? "Creating..." : "Create Custom Page"}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  Service product
                  <select
                    className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                    onChange={(event) => setSelectedServiceId(event.target.value)}
                    value={selectedServiceId}
                  >
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name_label ?? item.name} · {item.service_category || "Uncategorized"} · {item.status === "not_created" ? "Not Created" : item.status === "published" ? "Published" : "Draft"}
                      </option>
                    ))}
                  </select>
                </label>

                {selectedService ? (
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                    <p className="font-semibold text-slate-950">{selectedService.name_label ?? selectedService.name}</p>
                    <p className="mt-1">Current status: {selectedService.status === "not_created" ? "Not Created" : selectedService.status}</p>
                    {selectedService.slug ? <p className="mt-1">Current slug: /{selectedService.slug}</p> : null}
                  </div>
                ) : null}

                <Link
                  aria-disabled={!selectedServiceId}
                  className={"inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold text-white transition " + (selectedServiceId ? "bg-teal-700 hover:bg-teal-800" : "pointer-events-none bg-slate-300")}
                  href={selectedServiceId ? "/admin/service-pages/" + selectedServiceId + "/edit" : "#"}
                >
                  <FilePlus2 className="h-4 w-4" />
                  Create or Edit Service Page
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
