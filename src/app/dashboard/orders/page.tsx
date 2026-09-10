"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { DashboardNavigation } from "@/components/dashboard/DashboardNavigation";
import { AdminProcessingJobsContent, PageHeader } from "@/components/workspace-pages";
import { useAuthUser } from "@/admin/hooks/useAuthUser";
import { useAuth } from "@/store/auth-provider";

export default function DashboardOrdersPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { isAdmin, loading } = useAuthUser({ enabled: isAuthenticated });

  useEffect(() => {
    if (!loading && (!isAuthenticated || !isAdmin)) router.replace("/");
  }, [isAdmin, isAuthenticated, loading, router]);

  if (loading || !isAuthenticated || !isAdmin) return <main className="min-h-screen bg-slate-50 p-8 text-center text-sm text-slate-500">Checking dashboard access…</main>;

  return <><DashboardNavigation /><PageHeader eyebrow="Operations" title="Orders & processing" description="Monitor processing orders, job state, and eligible retry attempts." /><AdminProcessingJobsContent /></>;
}
