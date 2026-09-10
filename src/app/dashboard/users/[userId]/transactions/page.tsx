"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { apiRequest, getErrorMessage } from "@/api/client";
import { useAuthUser } from "@/admin/hooks/useAuthUser";
import { DashboardNavigation } from "@/components/dashboard/DashboardNavigation";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorMessage, LoadingState, PageHeader, Panel } from "@/components/ui";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/store/auth-provider";

type User = { full_name: string; email: string; wallet_balance_cents: number };
type Entry = { id: number; job_id: string | null; description: string; credit_cents: number | null; debit_cents: number | null; balance_cents: number | null; created_at: string };
type Page<T> = { results: T[]; next: string | null; previous: string | null };
const money = (cents: number | null) => new Intl.NumberFormat("en", { style: "currency", currency: "USD" }).format((cents || 0) / 100);

export default function UserTransactionsPage() {
  const { userId } = useParams<{ userId: string }>(); const router = useRouter(); const { isAuthenticated } = useAuth(); const { isAdmin, loading: authLoading } = useAuthUser({ enabled: isAuthenticated }); const [user, setUser] = useState<User | null>(null); const [entries, setEntries] = useState<Entry[]>([]); const [page, setPage] = useState(1); const [next, setNext] = useState(false); const [previous, setPrevious] = useState(false); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const load = useCallback(async () => { setLoading(true); try { const [profile, transactions] = await Promise.all([apiRequest<User>(`/api/v1/admin/users/${userId}/`, { auth: true }), apiRequest<Page<Entry>>(`/api/v1/admin/users/${userId}/transactions/?page=${page}&page_size=20`, { auth: true })]); setUser(profile); setEntries(transactions.results); setNext(Boolean(transactions.next)); setPrevious(Boolean(transactions.previous)); } catch (caught) { setError(getErrorMessage(caught)); } finally { setLoading(false); } }, [page, userId]);
  useEffect(() => { if (!authLoading && (!isAuthenticated || !isAdmin)) router.replace("/"); }, [authLoading, isAdmin, isAuthenticated, router]);
  useEffect(() => { if (isAdmin) void Promise.resolve().then(() => load()); }, [isAdmin, load]);
  if (authLoading || loading) return <LoadingState label="Loading wallet transactions..." />;
  return <><DashboardNavigation /><PageHeader eyebrow="User wallet" title={`${user?.full_name || "User"} transactions`} description={`${user?.email || ""} · Current balance: ${money(user?.wallet_balance_cents || 0)}`} /><Panel><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">Wallet transaction history</h2><Button asChild variant="outline"><Link href="/dashboard/users">Back to users</Link></Button></div><ErrorMessage message={error} />{entries.length === 0 ? <EmptyState title="No transactions" description="This user has no wallet transactions." /> : <div className="mt-5 overflow-x-auto rounded-lg border border-slate-200"><Table className="min-w-[48rem]"><TableHeader><TableRow><TableHead>Date and time</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Credit</TableHead><TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Balance</TableHead></TableRow></TableHeader><TableBody>{entries.map((entry) => <TableRow key={entry.id}><TableCell className="whitespace-nowrap text-slate-600">{new Date(entry.created_at).toLocaleString()}</TableCell><TableCell><p className="font-medium">{entry.description || "Wallet entry"}</p>{entry.job_id ? <p className="mt-1 text-xs text-slate-500">Job: {entry.job_id}</p> : null}</TableCell><TableCell className="text-right font-medium text-emerald-700">{entry.credit_cents ? `+${money(entry.credit_cents)}` : "—"}</TableCell><TableCell className="text-right font-medium text-red-700">{entry.debit_cents ? `−${money(entry.debit_cents)}` : "—"}</TableCell><TableCell className="text-right font-semibold">{money(entry.balance_cents)}</TableCell></TableRow>)}</TableBody></Table></div>}<div className="mt-5 flex items-center justify-between"><p className="text-sm text-slate-500">Page {page} · 20 transactions per page</p><div className="flex gap-2"><Button disabled={!previous} onClick={() => setPage((value) => value - 1)} type="button" variant="outline"><ChevronLeft /> Previous</Button><Button disabled={!next} onClick={() => setPage((value) => value + 1)} type="button" variant="outline">Next <ChevronRight /></Button></div></div></Panel></>;
}
