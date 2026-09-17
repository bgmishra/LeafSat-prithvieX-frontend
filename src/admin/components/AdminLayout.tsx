"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Building2 } from "lucide-react";
import { useAuthUser } from "@/admin/hooks/useAuthUser";
import { ToastProvider } from "./ToastProvider";

const adminNavigation = [
  { href: "/admin/clients", icon: Building2, label: "Client Companies" },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { error, isAdmin, loading } = useAuthUser();

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace("/dashboard");
    }
  }, [isAdmin, loading, router]);

  if (loading) {
    return (
      <ToastProvider>
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
          Checking admin access...
        </div>
      </ToastProvider>
    );
  }

  if (!isAdmin) {
    return (
      <ToastProvider>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {error || "You do not have permission to access the admin dashboard."}
        </div>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <div className="grid gap-4 xl:grid-cols-[18rem_1fr] lg:px-4 lg:py-4">
        <aside className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm xl:sticky xl:top-24 xl:h-[calc(100vh-8rem)]">
          <div className="border-b border-slate-200 px-3 pb-4 pt-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">Admin</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-950">Administration</h2>
            <p className="mt-1 text-sm text-slate-500">Client onboarding</p>
          </div>
          <nav className="mt-3 grid gap-1">
            {adminNavigation.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  className={`flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold transition ${
                    active ? "bg-teal-50 text-teal-800" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                  }`}
                  href={item.href}
                  key={item.href}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>
        <section className="min-w-0">{children}</section>
      </div>
    </ToastProvider>
  );
}
