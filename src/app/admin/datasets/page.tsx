"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { DatasetMarkdownEditor } from "@/components/datasets/DatasetMarkdownEditor";
import { useApiClient } from "@/admin/hooks/useApiClient";

type Option = { id: number; name?: string; name_label?: string; source_name_label?: string };
type Dataset = {
  id: number;
  title: string;
  overview: string;
  description: string;
  thumbnail_url: string | null;
  cover_image_url: string | null;
  is_featured: boolean;
  is_published: boolean;
  service: number | null;
  data_source: number | null;
  categories: Option[];
  tags: Option[];
};

type FormState = {
  title: string;
  overview: string;
  description: string;
  thumbnail: File | null;
  service: string;
  data_source: string;
  category_ids: number[];
  tag_ids: number[];
  is_featured: boolean;
  is_published: boolean;
  cover_image: File | null;
};

const emptyForm = (): FormState => ({
  title: "",
  overview: "",
  description: "",
  thumbnail: null,
  service: "",
  data_source: "",
  category_ids: [],
  tag_ids: [],
  is_featured: false,
  is_published: false,
  cover_image: null,
});

function optionLabel(option: Option) {
  return option.name ?? option.name_label ?? option.source_name_label ?? `Item ${option.id}`;
}

function ToggleList({
  label,
  options,
  selected,
  onChange,
  optionGridClass = "space-y-2",
}: {
  label: string;
  options: Option[];
  selected: number[];
  onChange: (ids: number[]) => void;
  optionGridClass?: string;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-slate-800">{label}</legend>
      <div className={`max-h-40 overflow-y-auto rounded-md border border-slate-200 p-3 ${optionGridClass}`}>
        {options.length === 0 ? <p className="text-sm text-slate-500">No {label.toLowerCase()} yet.</p> : null}
        {options.map((option) => (
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700" key={option.id}>
            <input
              checked={selected.includes(option.id)}
              onChange={(event) => onChange(event.target.checked
                ? [...selected, option.id]
                : selected.filter((id) => id !== option.id))}
              type="checkbox"
            />
            {optionLabel(option)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function DatasetsAdminPage() {
  const { request } = useApiClient();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [tags, setTags] = useState<Option[]>([]);
  const [services, setServices] = useState<Option[]>([]);
  const [sources, setSources] = useState<Option[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [newTag, setNewTag] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [datasetData, categoryData, tagData, serviceData, sourceData] = await Promise.all([
        request<Dataset[]>("/api/v1/datasets/"),
        request<Option[]>("/api/v1/categories/"),
        request<Option[]>("/api/v1/tags/"),
        request<Option[]>("/api/v1/services/"),
        request<Option[]>("/api/v1/data-sources/"),
      ]);
      setDatasets(datasetData);
      setCategories([...categoryData].sort((left, right) => optionLabel(left).localeCompare(optionLabel(right))));
      setTags([...tagData].sort((left, right) => optionLabel(left).localeCompare(optionLabel(right))));
      setServices(serviceData);
      setSources(sourceData);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Unable to load the dataset catalog.");
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm());
  }

  function startEdit(dataset: Dataset) {
    setEditingId(dataset.id);
    setForm({
      title: dataset.title,
      overview: dataset.overview ?? "",
      description: dataset.description ?? "",
      thumbnail: null,
      service: dataset.service ? String(dataset.service) : "",
      data_source: dataset.data_source ? String(dataset.data_source) : "",
      category_ids: dataset.categories.map((category) => category.id),
      tag_ids: dataset.tags.map((tag) => tag.id),
      is_featured: dataset.is_featured,
      is_published: dataset.is_published,
      cover_image: null,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveDataset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    const payload = {
      title: form.title,
      overview: form.overview,
      description: form.description,
      service: form.service ? Number(form.service) : null,
      data_source: form.data_source ? Number(form.data_source) : null,
      category_ids: form.category_ids,
      tag_ids: form.tag_ids,
      is_featured: form.is_featured,
      is_published: form.is_published,
    };

    try {
      let savedDataset: Dataset;
      if (form.thumbnail || form.cover_image) {
        const body = new FormData();
        Object.entries(payload).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            value.forEach((id) => body.append(key, String(id)));
          } else {
            body.append(key, String(value ?? ""));
          }
        });
        if (form.thumbnail) body.append("thumbnail", form.thumbnail);
        if (form.cover_image) body.append("cover_image", form.cover_image);
        savedDataset = await request<Dataset>(`/api/v1/datasets/${editingId ? `${editingId}/` : ""}`, {
          body,
          method: editingId ? "PATCH" : "POST",
        });
      } else {
        savedDataset = await request<Dataset>(`/api/v1/datasets/${editingId ? `${editingId}/` : ""}`, {
          body: JSON.stringify(payload),
          method: editingId ? "PATCH" : "POST",
        });
      }
      if (editingId) {
        setMessage("Dataset updated.");
      } else {
        setEditingId(savedDataset.id);
        setForm({ ...form, thumbnail: null, cover_image: null });
        setMessage("Dataset created. You can now upload Markdown images.");
      }
      await load();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Unable to save dataset.");
    } finally {
      setSaving(false);
    }
  }

  async function createVocabulary(kind: "categories" | "tags", value: string) {
    const name = value.trim();
    if (!name) return;
    try {
      await request(`/api/v1/${kind}/`, { body: JSON.stringify({ name }), method: "POST" });
      if (kind === "categories") setNewCategory("");
      else setNewTag("");
      await load();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : `Unable to create ${kind.slice(0, -1)}.`);
    }
  }

  async function removeDataset(id: number) {
    if (!window.confirm("Delete this dataset from the catalog?")) return;
    try {
      await request(`/api/v1/datasets/${id}/`, { method: "DELETE" });
      if (editingId === id) resetForm();
      setMessage("Dataset deleted.");
      await load();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Unable to delete dataset.");
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">Catalog</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Dataset Catalog</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Create searchable dataset cards and connect them to optional analysis services and extraction data sources.</p>
      </header>

      {message ? <p className="rounded-md border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">{message}</p> : null}

      <form className="space-y-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm" onSubmit={saveDataset}>
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-950">{editingId ? "Edit dataset" : "Add dataset"}</h2>
          {editingId ? <button className="text-sm font-semibold text-teal-700 hover:text-teal-900" onClick={resetForm} type="button">Cancel edit</button> : null}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold text-slate-800">Title
            <input className="min-h-11 rounded-md border border-slate-300 px-3 font-normal" onChange={(event) => setForm({ ...form, title: event.target.value })} required value={form.title} />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-slate-800">Thumbnail {editingId ? "(replace optional)" : "(required)"}
            <input accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => setForm({ ...form, thumbnail: event.target.files?.[0] ?? null })} required={!editingId} type="file" />
            <span className="inline-flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-700 transition hover:border-teal-600 hover:bg-slate-50">
              <span className="rounded bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700">Upload thumbnail</span>
              <span className="truncate text-slate-500">{form.thumbnail?.name ?? "No file selected"}</span>
            </span>
            <span className="text-xs font-normal text-slate-500">JPG, PNG, or WebP. Maximum 10 MB.</span>
          </label>
          <label className="grid gap-2 text-sm font-semibold text-slate-800">Cover image {editingId ? "(replace optional)" : "(required)"}
            <input accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => setForm({ ...form, cover_image: event.target.files?.[0] ?? null })} required={!editingId} type="file" />
            <span className="inline-flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-slate-300 bg-white px-3 text-sm font-normal text-slate-700 transition hover:border-teal-600 hover:bg-slate-50">
              <span className="rounded bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700">Upload cover image</span>
              <span className="truncate text-slate-500">{form.cover_image?.name ?? "No file selected"}</span>
            </span>
            <span className="text-xs font-normal text-slate-500">JPG, PNG, or WebP. Maximum 10 MB.</span>
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-800">Analysis service
            <select
              className="min-h-11 rounded-md border border-slate-300 px-3 font-normal disabled:cursor-not-allowed disabled:bg-slate-100"
              disabled={Boolean(form.data_source)}
              onChange={(event) => setForm({ ...form, service: event.target.value, data_source: "" })}
              value={form.service}
            >
              <option value="">None — use an extraction data source instead</option>{services.map((option) => <option key={option.id} value={option.id}>{optionLabel(option)}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-800">Extraction data source
            <select
              className="min-h-11 rounded-md border border-slate-300 px-3 font-normal disabled:cursor-not-allowed disabled:bg-slate-100"
              disabled={Boolean(form.service)}
              onChange={(event) => setForm({ ...form, data_source: event.target.value, service: "" })}
              value={form.data_source}
            >
              <option value="">None — use an analysis service instead</option>{sources.map((option) => <option key={option.id} value={option.id}>{optionLabel(option)}</option>)}
            </select>
          </label>
        </div>
        <p className="text-sm text-slate-500">Choose one optional connection: either an analysis service or an extraction data source. Leave both as None for a standalone catalog entry.</p>
        <label className="grid gap-1 text-sm font-semibold text-slate-800">Overview
          <textarea className="min-h-24 rounded-md border border-slate-300 px-3 py-2 font-normal" onChange={(event) => setForm({ ...form, overview: event.target.value })} placeholder="Short summary shown with the dataset" value={form.overview} />
        </label>
        <div className="w-full">
            <DatasetMarkdownEditor
              datasetId={editingId ?? undefined}
              disabled={saving}
              onChange={(description) => setForm({ ...form, description })}
              value={form.description}
            />
          </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="w-full" style={{ gridColumn: "1 / -1" }}>
            <ToggleList
              label="Categories"
              onChange={(category_ids) => setForm({ ...form, category_ids })}
              optionGridClass="grid grid-cols-2 gap-x-4 gap-y-2"
              options={categories}
              selected={form.category_ids}
            />
          </div>
          <div className="w-full" style={{ gridColumn: "1 / -1" }}>
            <ToggleList
              label="Tags"
              onChange={(tag_ids) => setForm({ ...form, tag_ids })}
              optionGridClass="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
              options={tags}
              selected={form.tag_ids}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-5 text-sm font-semibold text-slate-800">
          <label className="flex items-center gap-2"><input checked={form.is_featured} onChange={(event) => setForm({ ...form, is_featured: event.target.checked })} type="checkbox" />Featured dataset</label>
          <label className="flex items-center gap-2"><input checked={form.is_published} onChange={(event) => setForm({ ...form, is_published: event.target.checked })} type="checkbox" />Publish publicly</label>
        </div>
        <button className="min-h-11 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60" disabled={saving} type="submit">{saving ? "Saving..." : editingId ? "Save changes" : "Create dataset"}</button>
      </form>

      <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2">
        <div><h2 className="font-semibold text-slate-950">Add category</h2><div className="mt-3 flex gap-2"><input className="min-h-10 flex-1 rounded-md border border-slate-300 px-3 text-sm" onChange={(event) => setNewCategory(event.target.value)} placeholder="e.g. Climate" value={newCategory} /><button className="rounded-md border border-teal-700 px-3 text-sm font-semibold text-teal-800" onClick={() => void createVocabulary("categories", newCategory)} type="button">Add</button></div></div>
        <div><h2 className="font-semibold text-slate-950">Add tag</h2><div className="mt-3 flex gap-2"><input className="min-h-10 flex-1 rounded-md border border-slate-300 px-3 text-sm" onChange={(event) => setNewTag(event.target.value)} placeholder="e.g. Satellite" value={newTag} /><button className="rounded-md border border-teal-700 px-3 text-sm font-semibold text-teal-800" onClick={() => void createVocabulary("tags", newTag)} type="button">Add</button></div></div>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold text-slate-950">Catalog entries</h2></div>
        <div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-200 text-sm"><thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Dataset</th><th className="px-4 py-3">Categories</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-200">
          {loading ? <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={4}>Loading catalog...</td></tr> : null}
          {!loading && datasets.length === 0 ? <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={4}>No datasets have been added.</td></tr> : null}
          {datasets.map((dataset) => <tr key={dataset.id}><td className="px-4 py-4"><p className="font-semibold text-slate-950">{dataset.title}</p><p className="mt-1 line-clamp-2 max-w-xl text-slate-600">{dataset.description}</p></td><td className="px-4 py-4 text-slate-600">{dataset.categories.map(optionLabel).join(", ") || "-"}</td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${dataset.is_published ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{dataset.is_published ? "Published" : "Draft"}</span>{dataset.is_featured ? <span className="ml-2 text-xs font-semibold text-teal-700">Featured</span> : null}</td><td className="whitespace-nowrap px-4 py-4 text-right"><div className="inline-flex items-center gap-2"><button aria-label={`Edit ${dataset.title}`} className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-teal-200 bg-teal-50 px-3 text-xs font-semibold text-teal-800 transition hover:border-teal-300 hover:bg-teal-100 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2" onClick={() => startEdit(dataset)} type="button"><Pencil className="h-3.5 w-3.5" />Edit</button><button aria-label={`Delete ${dataset.title}`} className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-red-200 bg-white px-3 text-xs font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2" onClick={() => void removeDataset(dataset.id)} type="button"><Trash2 className="h-3.5 w-3.5" />Delete</button></div></td></tr>)}
        </tbody></table></div>
      </section>
    </div>
  );
}