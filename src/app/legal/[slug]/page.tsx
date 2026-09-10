import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Footer } from "@/components/frontpage/Footer";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";

export default async function PublicLegalDocumentPage({
  params,
}: PageProps<"/legal/[slug]">) {
  const { slug } = await params;

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <main className="mx-auto w-full max-w-4xl px-5 py-12 sm:px-6 lg:py-16">
        <Link className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-teal-700" href="/">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Home
        </Link>
        <LegalDocumentPage slug={slug} />
      </main>
      <Footer />
    </div>
  );
}
