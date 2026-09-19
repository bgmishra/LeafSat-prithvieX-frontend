"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthUser } from "@/admin/hooks/useAuthUser";
import { NotificationsFeed } from "@/components/notifications/NotificationsFeed";
import { PageHeader } from "@/components/ui";
import { useAuth } from "@/store/auth-provider";

export default function NotificationsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { loading, organizationRole } = useAuthUser({ enabled: isAuthenticated });
  const isClientUser = organizationRole !== null;

  useEffect(() => {
    if (!loading && !isClientUser) {
      router.replace("/");
    }
  }, [isClientUser, loading, router]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-8 text-center text-sm text-slate-500">
        Loading your notifications...
      </main>
    );
  }

  if (!isClientUser) {
    return (
      <main className="min-h-screen bg-slate-50 p-8 text-center text-sm text-slate-500">
        Notifications are for client accounts.
      </main>
    );
  }

  return (
    <div className="grid gap-6 p-4 sm:p-6">
      <PageHeader
        description="What your colleagues have done with train sections — approval requests, approvals, and rejections."
        eyebrow="Your company"
        title="Notifications"
      />
      <NotificationsFeed />
    </div>
  );
}
