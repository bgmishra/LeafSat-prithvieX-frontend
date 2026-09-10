import { AdminLegalDocumentEditor } from "@/components/legal/AdminLegalDocumentEditor";

export default function NewLegalDocumentPage() {
  return (
    <div className="mx-auto w-full max-w-7xl">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">Legal CMS</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Create legal document</h1>
      <p className="mt-2 mb-6 text-sm text-slate-600">Set a custom title, public slug, and Markdown content.</p>
      <AdminLegalDocumentEditor />
    </div>
  );
}
