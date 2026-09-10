"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ListOrdered, Users } from "lucide-react";

const links = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Overview" },
  { href: "/dashboard/orders", icon: ListOrdered, label: "Orders & processing" },
  { href: "/dashboard/users", icon: Users, label: "Users" },
];

export function DashboardNavigation() {
  const pathname = usePathname();
  return (
    <nav aria-label="Dashboard navigation" className="flex items-end gap-1 border-b border-slate-200">
      {links.map(({ href, icon: Icon, label }) => {
        const active = pathname === href;
        return <Link aria-current={active ? "page" : undefined} className={`inline-flex min-h-11 items-center gap-2 border-b-2 px-4 text-sm font-semibold transition ${active ? "border-teal-700 text-teal-800" : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-950"}`} href={href} key={href}><Icon className="size-4" />{label}</Link>;
      })}
    </nav>
  );
}
