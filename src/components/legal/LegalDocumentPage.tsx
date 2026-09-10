"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

import { getActiveLegalDocument, type LegalDocument } from "@/lib/legal-documents";

type LegalDocumentPageProps = { slug: string };

export function LegalDocumentPage({ slug }: LegalDocumentPageProps) {
  const [document, setDocument] = useState<LegalDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;
    async function loadDocument() {
      try {
        const data = await getActiveLegalDocument(slug);
        if (isCurrent) setDocument(data);
      } catch (caught) {
        if (isCurrent) setError(caught instanceof Error ? caught.message : "Unable to load this legal document.");
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }
    loadDocument();
    return () => { isCurrent = false; };
  }, [slug]);

  if (isLoading) return <p className="mt-10 text-sm text-slate-500">Loading legal document...</p>;
  if (error) return <p className="mt-10 rounded-md border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</p>;
  if (!document) return <p className="mt-10 rounded-md border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">This legal document is not available.</p>;

  return (
    <>
      <header className="mt-8 border-b border-slate-200 pb-8">
        {/* <p className="mono-label text-teal-700">Legal</p> */}
        <h1 className="mt-4 text-3xl font-semibold text-slate-950 sm:text-5xl">{document.title}</h1>
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-600">
          <span>Version {document.version}</span>
          {document.effective_date ? <span>Last updated: {document.effective_date}</span> : null}
        </div>
      </header>
      <article className="legal-document legal-document--light mt-10">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>{document.content}</ReactMarkdown>
      </article>
    </>
  );
}
