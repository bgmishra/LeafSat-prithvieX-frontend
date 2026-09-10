import Link from "next/link";
import { BarChart3, Database, FileText, Layers3, Ruler, WalletCards } from "lucide-react";

const adminLinks = [
  {
    description: "Create and edit Markdown landing pages for each service.",
    href: "/admin/service-pages",
    icon: FileText,
    label: "Service Pages",
  },
  {
    description: "Manage service products, pricing, date limits, and temporal choices.",
    href: "/admin/services",
    icon: BarChart3,
    label: "Services",
  },
  {
    description: "Manage source names that can be attached to service products.",
    href: "/admin/data-sources",
    icon: Database,
    label: "Data Sources",
  },
  {
    description: "Manage temporal resolution options available to service products.",
    href: "/admin/temporal-resolution-types",
    icon: Layers3,
    label: "Temporal Types",
  },
  {
    description: "Manage spatial resolution options in meters for service products.",
    href: "/admin/spatial-resolution-types",
    icon: Ruler,
    label: "Spatial Types",
  },
  {
    description: "View and maintain user computation balances and token balances.",
    href: "/admin/balances",
    icon: WalletCards,
    label: "Balances",
  },
];

export default function Page() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">PrithviEx Admin</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Admin Dashboard</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Choose the catalog or CMS area you want to manage.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {adminLinks.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              className="group rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-300 hover:bg-teal-50"
              href={item.href}
              key={item.href}
            >
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-teal-700 text-white">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">{item.label}</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p>
                  <span className="mt-4 inline-flex min-h-10 items-center justify-center rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition group-hover:bg-teal-800">
                    Open {item.label}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
