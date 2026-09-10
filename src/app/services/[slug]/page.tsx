import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Layers3 } from "lucide-react";
import { MarkdownRenderer } from "@/components/service-pages/MarkdownRenderer";
import { getPublicServicePage, servicePageTitle } from "@/lib/service-pages";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPublicServicePage(slug);

  if (!page) {
    return {
      title: "Service not found | PrithivieX",
    };
  }

  return {
    description: page.seo_description || page.short_description || undefined,
    title: `${page.seo_title || servicePageTitle(page)} | PrithivieX`,
  };
}

function metadataItem(label: string, value?: string | number | null) {
  if (value == null || value === "") {
    return null;
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-2 text-sm font-semibold text-slate-950">{value}</dd>
    </div>
  );
}

export default async function PublicServicePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getPublicServicePage(slug);

  if (!page) {
    notFound();
  }

  const service = page.service;
  const temporalTypes = service?.temporal_resolution_types?.map((item) => item.temporal_type_label ?? item.temporal_type).join(", ");
  const dataSources = service?.data_sources?.map((item) => item.source_name_label ?? item.source_name).join(", ");

  return (
    <main className="bg-slate-50 text-slate-950">
      <section className="relative overflow-hidden bg-slate-950 text-white">
        {page.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt="" className="absolute inset-0 h-full w-full object-cover opacity-55" src={page.cover_image_url} />
        ) : (
          <div className="absolute inset-0 bg-[linear-gradient(135deg,#0f766e,#0f172a_52%,#1e293b)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-slate-950/20" />
        <div className="relative mx-auto flex min-h-[30rem] max-w-6xl flex-col justify-end px-4 pb-16 pt-28 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-200">
            {service?.service_category || (service ? "Geospatial service" : "Page")}
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-bold tracking-tight sm:text-6xl">{servicePageTitle(page)}</h1>
          {page.short_description ? (
            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-200">{page.short_description}</p>
          ) : null}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <article className="min-w-0 space-y-8">
          {service ? (
            <div className="grid gap-4 md:grid-cols-4">
              {metadataItem("Service", service.name_label ?? service.name)}
              {metadataItem("Base price", service.base_price ? `${service.base_price} USD` : null)}
              {metadataItem("Temporal resolution", temporalTypes)}
              {metadataItem("Data Sources", dataSources)}
            </div>
          ) : null}

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
            <MarkdownRenderer content={page.markdown_content} />
          </div>
        </article>

        {service ? (
        <section className="mt-8 scroll-mt-24" id="related-services">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-2">
              <Layers3 className="h-5 w-5 text-teal-700" />
              <h2 className="text-lg font-semibold text-slate-950">Related Services</h2>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {page.related_services?.length ? (
                page.related_services.map((related) => (
                  <Link
                    className="group rounded-md border border-slate-200 p-3 transition hover:border-teal-300 hover:bg-teal-50"
                    href={`/services/${related.slug}`}
                    key={related.id}
                  >
                    <p className="font-semibold text-slate-950">{related.title}</p>
                    {related.short_description ? (
                      <p className="mt-1 line-clamp-2 text-sm text-slate-600">{related.short_description}</p>
                    ) : null}
                    <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-teal-700">
                      View service
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                ))
              ) : (
                <p className="text-sm text-slate-500">No related services are published yet.</p>
              )}
            </div>
          </div>
        </section>
        ) : null}
      </section>
    </main>
  );
}
