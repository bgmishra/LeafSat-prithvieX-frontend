"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Tag as TagIcon, X } from "lucide-react";

import { useApiClient } from "@/admin/hooks/useApiClient";

type Category = { id: number; name: string };
type Tag = { id: number; name: string };
type Dataset = {
  id: number;
  title: string;
  overview: string;
  description: string;
  thumbnail_url: string | null;
  cover_image_url: string | null;
  is_featured: boolean;
  categories: Category[];
  tags: Tag[];
};

function markdownExcerpt(markdown: string) {
  return markdown
    .replace(/^::youtube\s+\S+$/gim, "")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[`*_#>|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function DatasetCard({ dataset, onTagClick }: { dataset: Dataset; onTagClick: (tagName: string) => void }) {
  const imageUrl = dataset.thumbnail_url ?? dataset.cover_image_url;
  const excerpt = markdownExcerpt(dataset.overview);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md">
      <Link aria-label={`View ${dataset.title}`} className="aspect-[16/9] w-full overflow-hidden bg-slate-100" href={`/catalog/${dataset.id}`}>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" src={imageUrl} />
        ) : (
          <div className="h-full w-full bg-[linear-gradient(135deg,#0f766e,#164e63)]" />
        )}
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <h2 className="text-lg font-bold leading-snug text-[#0066cc]">
          <Link className="transition hover:text-teal-700 hover:underline" href={`/catalog/${dataset.id}`}>{dataset.title}</Link>
        </h2>
        {excerpt ? (
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-700">{excerpt}</p>
        ) : (
          <p className="mt-2 text-sm text-slate-500">No overview has been provided.</p>
        )}

        {dataset.tags.length > 0 ? (
          <div className="mt-5 border-t border-slate-100 pt-4">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-600">
              <TagIcon aria-hidden="true" className="h-3.5 w-3.5 text-teal-700" />
              Tags
            </p>
            <div className="flex flex-wrap gap-2">
              {dataset.tags.map((tag) => (
                <button
                  aria-label={`Filter datasets by ${tag.name}`}
                  className="rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800 transition hover:border-teal-400 hover:bg-teal-100 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
                  key={tag.id}
                  onClick={() => onTagClick(tag.name)}
                  type="button"
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default function CatalogPage() {
  const { request } = useApiClient();
  const [categories, setCategories] = useState<Category[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCatalog = useCallback(async (query = "", categoryId: number | null = null) => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (categoryId !== null) params.set("category", String(categoryId));

    try {
      const [categoryData, datasetData] = await Promise.all([
        request<Category[]>("/api/v1/categories/"),
        request<Dataset[]>(`/api/v1/datasets/${params.size ? `?${params.toString()}` : ""}`),
      ]);
      setCategories([...categoryData].sort((a, b) => a.name.localeCompare(b.name)));
      setDatasets(datasetData);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load the data catalog.");
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadCatalog(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadCatalog]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadCatalog(search, activeCategory);
  }

  function chooseCategory(categoryId: number | null) {
    setActiveCategory(categoryId);
    void loadCatalog(search, categoryId);
  }

  function chooseTag(tagName: string) {
    setSearch(tagName);
    void loadCatalog(tagName, activeCategory);
  }

  const featured = datasets.filter((dataset) => dataset.is_featured);
  const displayedDatasets = search || activeCategory !== null ? datasets : (featured.length ? featured : datasets);

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">PrithviEx</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Data Catalog</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">Explore published environmental datasets, linked analysis services, and extraction-ready sources.</p>
          <form className="mx-auto mt-7 max-w-2xl rounded-2xl bg-white/90 p-4 shadow-[0_14px_36px_rgba(13,148,136,0.10)] backdrop-blur sm:p-5" onSubmit={submitSearch}>
            <label className="mb-3 block text-center text-sm font-semibold text-slate-800" htmlFor="catalog-search">
              Find a dataset
            </label>
            <div className="flex flex-col gap-3 rounded-xl bg-slate-100/80 p-2.5 shadow-inner transition focus-within:bg-teal-50/70 focus-within:ring-4 focus-within:ring-teal-100 sm:flex-row">
              <div className="flex-1">
                <input
                  className="min-h-14 w-full rounded-lg bg-slate-100 px-5 py-3 text-base text-slate-950 shadow-[0_12px_30px_rgba(15,23,42,0.18)] ring-1 ring-slate-300 outline-none placeholder:text-slate-500 transition placeholder:transition focus:bg-white focus:ring-2 focus:ring-teal-600 focus:shadow-[0_16px_36px_rgba(13,148,136,0.28)] focus:placeholder:text-slate-400"
                  id="catalog-search"
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by dataset name, keyword, or tag"
                  value={search}
                />
              </div>
              <button className="min-h-14 rounded-lg bg-teal-700 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2" type="submit">
                Search catalog
              </button>
            </div>
            <p className="mt-3 text-center text-xs text-slate-500">Use a dataset title, keyword, or select a tag to narrow the catalog.</p>
          </form>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-8 sm:px-8 lg:flex-row">
        <aside className="w-full lg:sticky lg:top-6 lg:w-52 lg:shrink-0 lg:self-start">
          <h2 className="text-sm font-semibold text-slate-950">Categories</h2>
          <nav className="catalog-category-nav mt-3 grid grid-cols-2 gap-1 sm:flex sm:flex-col lg:max-h-[calc(100vh-10rem)] lg:overflow-y-auto lg:pr-1" aria-label="Dataset categories">
            <button className={`rounded px-2 py-1.5 text-left text-sm ${activeCategory === null ? "bg-teal-50 font-semibold text-teal-800" : "text-slate-600 hover:bg-slate-50"}`} onClick={() => chooseCategory(null)} type="button">All datasets</button>
            {categories.map((category) => <button className={`rounded px-2 py-1.5 text-left text-sm ${activeCategory === category.id ? "bg-teal-50 font-semibold text-teal-800" : "text-slate-600 hover:bg-slate-50"}`} key={category.id} onClick={() => chooseCategory(category.id)} type="button">{category.name}</button>)}
          </nav>
        </aside>

        <section className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3">
            <h2 className="text-lg font-semibold">{search || activeCategory !== null ? "Search results" : featured.length ? "Featured" : "Datasets"}</h2>
            {search || activeCategory !== null ? <button className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:text-teal-900" onClick={() => { setSearch(""); chooseCategory(null); }} type="button"><X className="h-4 w-4" />Clear filters</button> : null}
          </div>
          {error ? <p className="mt-5 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p> : null}
          {loading ? <p className="py-8 text-sm text-slate-500">Loading datasets…</p> : null}
          {!loading && !error && displayedDatasets.length === 0 ? <p className="py-8 text-sm text-slate-500">No published datasets match your search.</p> : null}
          {!loading && !error && displayedDatasets.length > 0 ? (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {displayedDatasets.map((dataset) => <DatasetCard dataset={dataset} key={dataset.id} onTagClick={chooseTag} />)}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}