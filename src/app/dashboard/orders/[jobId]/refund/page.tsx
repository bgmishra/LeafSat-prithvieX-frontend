"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiRequest, getErrorMessage } from "@/api/client";
import { useAuthUser } from "@/admin/hooks/useAuthUser";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DashboardNavigation } from "@/components/dashboard/DashboardNavigation";
import { ErrorMessage, LoadingState, PageHeader, Panel, SuccessMessage } from "@/components/ui";
import { useAuth } from "@/store/auth-provider";

type RefundInfo = { job_id: string; status: string; user_email: string; refunded: boolean; refund_amount_cents: number | null };

export default function RefundJobPage() {
  const { jobId } = useParams<{ jobId: string }>(); const router = useRouter(); const { isAuthenticated } = useAuth(); const { isAdmin, loading: authLoading } = useAuthUser({ enabled: isAuthenticated }); const [info, setInfo] = useState<RefundInfo | null>(null); const [error, setError] = useState(""); const [success, setSuccess] = useState(""); const [saving, setSaving] = useState(false);
  useEffect(() => { if (!authLoading && (!isAuthenticated || !isAdmin)) router.replace("/"); }, [authLoading, isAdmin, isAuthenticated, router]);
  useEffect(() => { if (!isAdmin) return; void apiRequest<RefundInfo>(`/api/v1/admin/jobs/${jobId}/refund/`, { auth: true }).then(setInfo).catch((caught) => setError(getErrorMessage(caught))); }, [isAdmin, jobId]);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setSaving(true); setError(""); const form = new FormData(event.currentTarget); try { const result = await apiRequest<{ message: string }>(`/api/v1/admin/jobs/${jobId}/refund/`, { auth: true, method: "POST", body: JSON.stringify({ reason: form.get("reason"), email_subject: form.get("subject"), email_body: form.get("body") }) }); setSuccess(result.message); } catch (caught) { setError(getErrorMessage(caught)); } finally { setSaving(false); } }
  if (authLoading || !info) return <LoadingState label="Loading refund workflow..." />;
  return <><DashboardNavigation /><PageHeader eyebrow="Failed job" title="Refund to wallet" description="Credit an eligible failed job back to the user and send a custom notification." /><Panel>{info.refunded ? <p>This job has already been refunded.</p> : <form className="space-y-5" onSubmit={submit}><ErrorMessage message={error} /><SuccessMessage message={success} /><div className="rounded-md bg-slate-50 p-4 text-sm"><p>User: {info.user_email}</p><p className="mt-1">Refund amount: ${((info.refund_amount_cents || 0) / 100).toFixed(2)}</p></div><label className="grid gap-2 text-sm font-medium">Reason<Textarea name="reason" required /></label><label className="grid gap-2 text-sm font-medium">Email subject<input className="h-10 rounded-md border border-slate-300 px-3" defaultValue="Your PrithivieX processing task could not be completed" name="subject" required /></label><label className="grid gap-2 text-sm font-medium">Email message<Textarea defaultValue="We are sorry, but your processing task could not be completed due to a technical issue. The amount has been credited to your PrithivieX wallet." name="body" required /></label><Button disabled={saving || !info.refund_amount_cents} type="submit">{saving ? "Processing refund..." : "Refund to wallet and send email"}</Button></form>}</Panel></>;
}
