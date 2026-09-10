"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

import { getActiveTermsOfService, type LegalDocument } from "@/lib/legal-documents";

function formatDate(value?: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function TermsSkeleton() {
  return (
    <div className="mt-10 space-y-4" aria-label="Loading Terms of Service">
      <div className="h-5 w-3/4 rounded bg-slate-200" />
      <div className="h-4 w-full rounded bg-slate-200" />
      <div className="h-4 w-11/12 rounded bg-slate-200" />
      <div className="h-4 w-10/12 rounded bg-slate-200" />
      <div className="h-4 w-full rounded bg-slate-200" />
    </div>
  );
}

export function TermsDocument() {
  const [terms, setTerms] = useState<LegalDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    async function loadTerms() {
      setIsLoading(true);
      setLoadError(false);

      try {
        const document = await getActiveTermsOfService();
        if (isCurrent) {
          setTerms(document);
        }
      } catch {
        if (isCurrent) {
          setTerms(null);
          setLoadError(true);
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    loadTerms();

    return () => {
      isCurrent = false;
    };
  }, []);

  const effectiveDate = formatDate(terms?.effective_date);

  return (
    <>
      <section className="mt-8 border-b border-border pb-8">
        <p className="mono-label text-teal-700">Legal</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-normal text-slate-950 sm:text-5xl">
          {terms?.title || "Terms of Service"}
        </h1>
        {terms ? (
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <span>Version {terms.version}</span>
            {effectiveDate ? <span>Effective {effectiveDate}</span> : null}
            {terms.updated_at ? (
              <span>Updated {formatDate(terms.updated_at.slice(0, 10))}</span>
            ) : null}
          </div>
        ) : null}
      </section>

      {isLoading ? <TermsSkeleton /> : null}

      {!isLoading && loadError ? (
        <section className="mt-10 border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Terms unavailable</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            We could not load the Terms of Service right now. Please try again shortly.
          </p>
        </section>
      ) : null}

      {!isLoading && !loadError && terms ? (
        <article className="legal-document legal-document--light mt-10">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
            {terms.content}
          </ReactMarkdown>
        </article>
      ) : null}

      {!isLoading && !loadError && !terms ? (
        <section className="mt-10 border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Terms not found</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            There is no active Terms of Service version available.
          </p>
        </section>
      ) : null}
    </>
  );
}
