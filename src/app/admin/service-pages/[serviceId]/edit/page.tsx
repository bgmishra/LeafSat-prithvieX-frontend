"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Eye, Globe2, Save, Send, XCircle } from "lucide-react";
import { ServicePageMarkdownEditor } from "@/admin/components/ServicePageMarkdownEditor";
import { useApiClient } from "@/admin/hooks/useApiClient";
import { useToast } from "@/admin/components/ToastProvider";
import type { ServiceDetailPage, ServicePageUploadResponse } from "@/lib/service-pages";

const emptyPage = {
  markdown_content: "",
  short_description: "",
  slug: "",
  title: "",
  seo_title: "",
  seo_description: "",
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function textValue(value: unknown) {
  if (value == null || value === "") {
    return "-";
  }

  return String(value);
}

export default function AdminServicePageEditPage() {
  const { request } = useApiClient();
  const toast = useToast();
  const params = useParams<{ serviceId: string }>();
  const serviceId = params.serviceId;
  const [page, setPage] = useState<ServiceDetailPage | null>(null);
  const [form, setForm] = useState(emptyPage);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!serviceId) {
      return;
    }

    let cancelled = false;

    async function loadPage() {
      setLoading(true);
      setError("");
      try {
        const response = await request<ServiceDetailPage>(`/api/v1/admin/service-pages/${serviceId}/`);
        if (!cancelled) {
          setPage(response);
          setForm({
            markdown_content: response.markdown_content || "",
            seo_description: response.seo_description || "",
            seo_title: response.seo_title || "",
            short_description: response.short_description || "",
            slug: response.slug || slugify(response.service?.name_label || response.service?.name || ""),
            title: response.title || response.service?.name_label || response.service?.name || "",
          });
        }
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Unable to load service page.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPage();

    return () => {
      cancelled = true;
    };
  }, [request, serviceId]);

  const publicUrl = useMemo(() => {
    if (!form.slug) {
      return "";
    }

    return `/services/${form.slug}`;
  }, [form.slug]);

  function updateField(name: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function buildPayload() {
    const payload = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      payload.set(key, value);
    });
    if (coverImage) {
      payload.set("cover_image", coverImage);
    }
    return payload;
  }

  async function savePage() {
    if (!serviceId || saving) {
      return null;
    }

    setSaving(true);
    setError("");
    try {
      const method = page?.id ? "PATCH" : "POST";
      const response = await request<ServiceDetailPage>(`/api/v1/admin/service-pages/${serviceId}/`, {
        body: buildPayload(),
        method,
      });
      setPage(response);
      setCoverImage(null);
      setForm((current) => ({
        ...current,
        slug: response.slug || current.slug,
      }));
      toast.notify({ title: "Service page saved.", type: "success" });
      return response;
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unable to save service page.";
      setError(message);
      toast.notify({ title: message, type: "error" });
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function publishPage() {
    const saved = await savePage();
    if (!saved || !serviceId) {
      return;
    }

    setSaving(true);
    try {
      const response = await request<ServiceDetailPage>(`/api/v1/admin/service-pages/${serviceId}/publish/`, {
        method: "POST",
      });
      setPage(response);
      toast.notify({ title: "Service page published.", type: "success" });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unable to publish service page.";
      setError(message);
      toast.notify({ title: message, type: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function unpublishPage() {
    if (!serviceId || saving) {
      return;
    }

    setSaving(true);
    setError("");
    try {
      const response = await request<ServiceDetailPage>(`/api/v1/admin/service-pages/${serviceId}/unpublish/`, {
        method: "POST",
      });
      setPage(response);
      toast.notify({ title: "Service page unpublished.", type: "success" });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Unable to unpublish service page.";
      setError(message);
      toast.notify({ title: message, type: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function uploadImage(file: File, altText: string) {
    const payload = new FormData();
    payload.set("image", file);
    payload.set("alt_text", altText);
    return request<ServicePageUploadResponse>(`/api/v1/admin/service-pages/${serviceId}/upload-image/`, {
      body: payload,
      method: "POST",
    });
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
        Loading service page editor...
      </div>
    );
  }

  const service = page?.service;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link className="inline-flex items-center gap-2 text-sm font-semibold text-teal-700" href="/admin/service-pages">
            <ArrowLeft className="h-4 w-4" />
            Service pages
          </Link>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">{service?.name_label ?? service?.name ?? "Service page"}</h1>
          <p className="mt-2 text-sm text-slate-600">
            {service?.service_category || "Service"} CMS page · Status: {page?.status || "not_created"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {page?.id ? (
            <Link
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              href={`/admin/service-pages/${serviceId}/preview`}
            >
              <Eye className="h-4 w-4" />
              Preview
            </Link>
          ) : null}
          {page?.is_published && publicUrl ? (
            <Link
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              href={publicUrl}
              target="_blank"
            >
              <Globe2 className="h-4 w-4" />
              Public page
            </Link>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="space-y-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Title
              <input
                className="min-h-11 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                onBlur={() => !form.slug && updateField("slug", slugify(form.title))}
                onChange={(event) => updateField("title", event.target.value)}
                value={form.title}
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Slug
              <input
                className="min-h-11 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                onChange={(event) => updateField("slug", slugify(event.target.value))}
                value={form.slug}
              />
            </label>
          </div>

          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Short description
            <textarea
              className="min-h-24 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              onChange={(event) => updateField("short_description", event.target.value)}
              value={form.short_description}
            />
          </label>


          <label className="grid gap-1 text-sm font-medium text-slate-700">
            Cover image
            <input
              accept="image/jpeg,image/png,image/webp"
              className="min-h-11 rounded-md border border-slate-300 px-3 py-2 text-sm"
              onChange={(event) => setCoverImage(event.target.files?.[0] || null)}
              type="file"
            />
          </label>

          {page?.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="" className="h-56 w-full rounded-lg border border-slate-200 object-cover" src={page.cover_image_url} />
          ) : null}

          <ServicePageMarkdownEditor
            disabled={saving}
            onChange={(value) => updateField("markdown_content", value)}
            onUpload={uploadImage}
            value={form.markdown_content}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              SEO title
              <input
                className="min-h-11 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                onChange={(event) => updateField("seo_title", event.target.value)}
                value={form.seo_title}
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              SEO description
              <input
                className="min-h-11 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                onChange={(event) => updateField("seo_description", event.target.value)}
                value={form.seo_description}
              />
            </label>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-950">Service metadata</h2>
            <dl className="mt-3 grid gap-3 text-sm">
              <div>
                <dt className="text-slate-500">Category</dt>
                <dd className="font-medium text-slate-900">{textValue(service?.service_category)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Base price</dt>
                <dd className="font-medium text-slate-900">{textValue(service?.base_price)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Base area ha</dt>
                <dd className="font-medium text-slate-900">{textValue(service?.area_with_base_price_ha)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Temporal resolution</dt>
                <dd className="font-medium text-slate-900">
                  {service?.temporal_resolution_types?.map((item) => item.temporal_type_label ?? item.temporal_type).join(", ") || "-"}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Data sources</dt>
                <dd className="font-medium text-slate-900">
                  {service?.data_sources?.map((item) => item.source_name_label ?? item.source_name).join(", ") || "-"}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-950">Publishing</h2>
            <p className="mt-2 text-sm text-slate-600">
              Public users only see this page after publishing. Drafts remain admin-only.
            </p>
            <div className="mt-4 grid gap-2">
              <button
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                disabled={saving}
                onClick={savePage}
                type="button"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving..." : "Save draft"}
              </button>
              <button
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
                disabled={saving}
                onClick={publishPage}
                type="button"
              >
                <Send className="h-4 w-4" />
                Publish
              </button>
              {page?.is_published ? (
                <button
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-red-200 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
                  disabled={saving}
                  onClick={unpublishPage}
                  type="button"
                >
                  <XCircle className="h-4 w-4" />
                  Unpublish
                </button>
              ) : null}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
