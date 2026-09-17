"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthUser } from "@/admin/hooks/useAuthUser";
import { ManageSectionsWorkspace } from "@/components/sections/ManageSectionsWorkspace";
import { PageHeader } from "@/components/ui";
import { useAuth } from "@/store/auth-provider";

export default function ManageSectionsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { isClientSuperAdmin, isEngineer, loading } = useAuthUser({ enabled: isAuthenticated });
  const canManage = isClientSuperAdmin || isEngineer;

  useEffect(() => {
    if (!loading && !canManage) {
      router.replace("/");
    }
  }, [canManage, loading, router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-8 text-center text-sm text-slate-500">
        Checking your access...
      </main>
    );
  }

  if (!canManage) {
    return (
      <main className="min-h-screen bg-slate-50 p-8 text-center text-sm text-slate-500">
        Only a client super admin or an engineer can manage train sections.
      </main>
    );
  }

  return (
    <div className="grid gap-6 p-4 sm:p-6">
      <PageHeader
        description={
          isClientSuperAdmin
            ? "Draft train sections and approve the ones your engineers send up. Approved sections are the only ones your field supervisors can see."
            : "Draft train sections and send them to your client super admin for approval."
        }
        eyebrow="Your company"
        title="Manage sections"
      />
      <ManageSectionsWorkspace canApprove={isClientSuperAdmin} />
    </div>
  );
}
