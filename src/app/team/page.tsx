"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { TeamWorkspace } from "@/components/invitations/TeamWorkspace";
import { PageHeader } from "@/components/ui";
import { useAuthUser } from "@/admin/hooks/useAuthUser";
import { useAuth } from "@/store/auth-provider";

export default function TeamPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { isClientSuperAdmin, loading } = useAuthUser({ enabled: isAuthenticated });

  useEffect(() => {
    if (!loading && !isClientSuperAdmin) {
      router.replace("/");
    }
  }, [isClientSuperAdmin, loading, router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-8 text-center text-sm text-slate-500">
        Checking your access...
      </main>
    );
  }

  if (!isClientSuperAdmin) {
    return (
      <main className="min-h-screen bg-slate-50 p-8 text-center text-sm text-slate-500">
        Only a client super admin can manage team members.
      </main>
    );
  }

  return (
    <div className="grid gap-6 p-4 sm:p-6">
      <PageHeader
        description="Invite your engineers and field supervisors, and control who can sign in to LeafSat for your company."
        eyebrow="Your company"
        title="Team"
      />
      <TeamWorkspace />
    </div>
  );
}
