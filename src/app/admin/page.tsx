import Link from "next/link";
import { Building2 } from "lucide-react";

export default function AdminPage() {
  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">Administration</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-950">LeafSat system admin</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
          Invite client companies to LeafSat and control their access. Everything inside a client —
          their team and their train sections — is managed by that company&apos;s own client super
          admin.
        </p>
      </div>

      <Link
        className="flex max-w-xl items-start gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:border-teal-300 hover:shadow"
        href="/admin/clients"
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
          <Building2 className="size-5" />
        </span>
        <span>
          <span className="block text-lg font-semibold text-slate-950">Client Companies</span>
          <span className="mt-1 block text-sm leading-6 text-slate-600">
            Send invitations, see who has completed registration, and suspend or restore access.
          </span>
        </span>
      </Link>
    </div>
  );
}
