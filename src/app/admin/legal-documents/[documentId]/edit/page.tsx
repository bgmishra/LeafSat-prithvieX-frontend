import { notFound } from "next/navigation";

import { AdminLegalDocumentEditor } from "@/components/legal/AdminLegalDocumentEditor";

export default async function EditLegalDocumentPage({
  params,
}: PageProps<"/admin/legal-documents/[documentId]/edit">) {
  const { documentId } = await params;
  const id = Number(documentId);

  if (!Number.isInteger(id) || id <= 0) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-7xl">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">Legal CMS</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Edit legal document</h1>
      <p className="mt-2 mb-6 text-sm text-slate-600">Update the document content, publication status, and public slug.</p>
      <AdminLegalDocumentEditor documentId={id} />
    </div>
  );
}
