"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CreditCard, LoaderCircle, ChevronLeft, ChevronRight, ExternalLink, RefreshCw, Wallet, X } from "lucide-react";
import { loadStripe, Stripe, StripeCardCvcElement, StripeCardExpiryElement, StripeCardNumberElement } from "@stripe/stripe-js";
import { apiRequest, getErrorMessage } from "@/api/client";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Pagination, PaginationContent, PaginationInfo } from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  EmptyState,
  ErrorMessage,
  LoadingState,
  PageHeader,
  Panel,
  StatusBadge,
  SubmitButton,
  SuccessMessage,
  TextArea,
  TextField,
} from "./ui";

type Profile = {
  name?: string;
  full_name?: string;
  affiliation?: string | null;
  email?: string;
};

type ProcessingJobListItem = {
  id?: string | number;
  jobId?: string | number;
  job_id?: string | number;
  orderName?: string;
  order_name?: string;
  status?: string;
  serviceName?: string;
  service_name?: string;
  userEmail?: string;
  user_email?: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  processingAmountUsd :string | null;
};

type ProcessingJobListResponse =
  | ProcessingJobListItem[]
  | {
      count?: number;
      total?: number;
      totalCount?: number;
      page?: number;
      pageSize?: number;
      results?: ProcessingJobListItem[];
      items?: ProcessingJobListItem[];
      data?: ProcessingJobListItem[];
      next?: string | null;
      previous?: string | null;
    };

const ORDERS_PAGE_SIZE = 50;
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const walletTopUpIntentPath =
  process.env.NEXT_PUBLIC_STRIPE_WALLET_TOPUP_INTENT_PATH ||
  "/api/v1/payments/wallet-topup-intent/";
const walletTopUpConfirmPath =
  process.env.NEXT_PUBLIC_STRIPE_WALLET_TOPUP_CONFIRM_PATH ||
  "/api/v1/payments/wallet-topup-confirm/";
const walletTransactionsPath =
  process.env.NEXT_PUBLIC_WALLET_TRANSACTIONS_PATH ||
  "/api/v1/wallet-transactions/";
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;
const topUpAmounts = [25, 50, 100, 250, 500, 1000, 1500, 2000, 5000];
const countryOptions = [
  { code: "NP", name: "Nepal" },
  { code: "US", name: "United States" },
  { code: "IN", name: "India" },
  { code: "GB", name: "United Kingdom" },
  { code: "AU", name: "Australia" },
  { code: "CA", name: "Canada" },
  { code: "SG", name: "Singapore" },
  { code: "AE", name: "United Arab Emirates" },
];

type WalletBalance = {
  id?: number | string;
  balance?: string | number | null;
  balance_display?: string | number | null;
  current_balance?: string | number | null;
  token?: string | number | null;
  user?: {
    email?: string;
    full_name?: string;
    fullName?: string;
    name?: string;
  } | string | number | null;
  user_detail?: {
    email?: string;
    full_name?: string;
    fullName?: string;
    name?: string;
  } | null;
};

type WalletBalanceCollection = {
  results?: WalletBalance[];
  items?: WalletBalance[];
  data?: WalletBalance[];
};

type WalletBalanceResponse =
  | WalletBalance
  | WalletBalance[]
  | WalletBalanceCollection;

type WalletTransaction = {
  id?: string | number;
  amount?: string | number | null;
  amount_display?: string | number | null;
  amount_cents?: string | number | null;
  balance_change?: string | number | null;
  balance_display?: string | number | null;
  balance_cents?: string | number | null;
  created_at?: string;
  createdAt?: string;
  date?: string;
  description?: string;
  label?: string;
  transaction_type?: string;
  type?: string;
};

type WalletTransactionResponse =
  | WalletTransaction[]
  | {
      results?: WalletTransaction[];
      items?: WalletTransaction[];
      data?: WalletTransaction[];
    };

type WalletTransactionRow = {
  id: string;
  label: string;
  date: string;
  amount: number;
  kind: "credit" | "debit" | "neutral";
};

type OrderRow = {
  id: string;
  name: string;
  service: string;
  date: string;
  amount: string;
  status: string;
  isComplete: boolean;
  processingAmountUsd :string | null;
};

function getProcessingJobs(response: ProcessingJobListResponse) {
  if (Array.isArray(response)) {
    return {
      jobs: response,
      count: response.length,
      next: null,
      previous: null,
    };
  }

  const jobs = response.results || response.items || response.data || [];

  return {
    jobs,
    count: response.count ?? response.total ?? response.totalCount ?? jobs.length,
    next: response.next ?? null,
    previous: response.previous ?? null,
  };
}

function formatOrderDate(value?: string) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "short",
    second: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
    year: "numeric",
  }).format(date);
}

function statusLabel(status?: string) {
  const normalized = (status || "Pending").toUpperCase();
  const labels: Record<string, string> = {
    FAILED: "Failed",
    PENDING: "Pending",
    RUNNING: "Processing",
    SUCCESS: "Completed",
    CANCELLED: "Cancelled",
  };

  return labels[normalized] || status || "Pending";
}

function toOrderRow(job: ProcessingJobListItem): OrderRow {
  const id = String(job.jobId || job.job_id || job.id || "");
  const rawStatus = (job.status || "").toUpperCase();

  return {
    id,
    name: job.orderName || job.order_name || id,
    service: job.serviceName || job.service_name || "Processing job",
    date: formatOrderDate(job.createdAt || job.created_at),
    amount: "Included",
    status: statusLabel(job.status),
    isComplete: rawStatus === "SUCCESS",
    processingAmountUsd: job.processingAmountUsd || null,
  };
}

function isWalletBalanceCollection(response: WalletBalanceResponse): response is WalletBalanceCollection {
  return !Array.isArray(response) && (
    "results" in response || "items" in response || "data" in response
  );
}

function getWalletBalanceItem(response: WalletBalanceResponse): WalletBalance | null {
  if (Array.isArray(response)) {
    return response[0] || null;
  }

  if (isWalletBalanceCollection(response)) {
    return response.results?.[0] || response.items?.[0] || response.data?.[0] || null;
  }

  return response;
}

function toNumber(value: unknown) {
  if (value == null || value === "") {
    return 0;
  }

  const parsed = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en", {
    currency: "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency",
  }).format(value);
}

function getWalletTransactions(response: WalletTransactionResponse) {
  if (Array.isArray(response)) {
    return response;
  }

  return response.results || response.items || response.data || [];
}

function toWalletTransactionRow(transaction: WalletTransaction, index: number): WalletTransactionRow {
  const amount =
    transaction.amount_display != null
      ? toNumber(transaction.amount_display)
      : transaction.amount != null
        ? toNumber(transaction.amount)
        : transaction.balance_change != null
          ? toNumber(transaction.balance_change)
          : toNumber(transaction.amount_cents) / 100;

  const label =
    transaction.description ||
    transaction.label ||
    transaction.transaction_type ||
    transaction.type ||
    "Wallet transaction";

  const normalizedType = String(transaction.transaction_type || transaction.type || "").toLowerCase();
  const normalizedLabel = label.toLowerCase();

  let kind: WalletTransactionRow["kind"] = "neutral";
  if (
    normalizedType.includes("withdraw") ||
    normalizedType.includes("debit") ||
    normalizedType.includes("expense") ||
    amount < 0
  ) {
    kind = "debit";
  } else if (
    normalizedType.includes("top_up") ||
    normalizedType.includes("topup") ||
    normalizedType.includes("credit") ||
    normalizedType.includes("deposit") ||
    normalizedLabel.includes("initial registration top-up") ||
    amount > 0
  ) {
    kind = "credit";
  }

  return {
    amount,
    date: formatOrderDate(transaction.created_at || transaction.createdAt || transaction.date),
    id: String(transaction.id || `${label}-${index}`),
    label,
    kind,
  };
}

async function fetchOrders(page: number) {
  const response = await apiRequest<ProcessingJobListResponse>(
    `/api/v1/processing/jobs/?page=${page}&pageSize=${ORDERS_PAGE_SIZE}`,
    { auth: true },
  );
  const parsed = getProcessingJobs(response);

  return {
    orders: parsed.jobs.map(toOrderRow).filter((order) => order.id),
    count: parsed.count,
    hasNextPage: Boolean(parsed.next),
    hasPreviousPage: Boolean(parsed.previous),
  };
}

export function RequestForm({
  type,
}: {
  type: "service-analysis" | "data-extraction";
}) {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const isAnalysis = type === "service-analysis";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 700));
    setLoading(false);
    setSuccess(
      isAnalysis
        ? "Service analysis request captured. API endpoint for this workflow can be connected next."
        : "Data extraction request captured. API endpoint for this workflow can be connected next.",
    );
    event.currentTarget.reset();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <Panel>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <ErrorMessage message={error} />
          <SuccessMessage message={success} />
          {isAnalysis ? (
            <>
              <TextField label="Website or service URL" name="url" placeholder="https://example.com" required type="url" />
              <TextField label="Business category" name="category" placeholder="Fintech, education, ecommerce" required />
              <TextArea label="Analysis goals" name="goals" placeholder="Describe what should be reviewed, compared, or scored." required />
            </>
          ) : (
            <>
              <TextField label="Source URL" name="source" placeholder="https://example.com/data" required type="url" />
              <TextField label="Output format" name="format" placeholder="CSV, JSON, spreadsheet" required />
              <TextArea label="Data fields required" name="fields" placeholder="List the fields, filters, and extraction rules." required />
            </>
          )}
          <SubmitButton loading={loading}>{isAnalysis ? "Start analysis" : "Start extraction"}</SubmitButton>
        </form>
      </Panel>
      <div className="space-y-6">
        <Panel>
          <h2 className="text-lg font-semibold text-slate-950">Required points</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
            <li>Provide a valid source URL or service target.</li>
            <li>Include the business goal and expected output.</li>
            <li>Review submitted details before starting a paid order.</li>
          </ul>
        </Panel>
        <EmptyState
          title="No recent submissions"
          description="Submitted requests will appear here when the workflow endpoint is available."
        />
      </div>
    </div>
  );
}

type AdminDashboardOverview = {
  users: { total: number; active: number; disabled: number };
  jobs: {
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
    retried: number;
  };
  wallets: { total_user_balance_cents: number };
};

export function DashboardContent() {
  const [overview, setOverview] = useState<AdminDashboardOverview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    apiRequest<AdminDashboardOverview>("/api/v1/admin/dashboard/overview/", { auth: true })
      .then((data) => {
        if (active) setOverview(data);
      })
      .catch((caught) => {
        if (active) setError(getErrorMessage(caught));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  if (loading) return <LoadingState label="Loading operational overview..." />;
  if (error) return <ErrorMessage message={error} />;
  if (!overview) return <EmptyState title="No dashboard data" description="Dashboard metrics are currently unavailable." />;

  const metrics = [
    ["Total users", overview.users.total, `${overview.users.active} active · ${overview.users.disabled} disabled`],
    ["Processing jobs", overview.jobs.total, `${overview.jobs.running} running · ${overview.jobs.pending} pending`],
    ["Completed jobs", overview.jobs.completed, `${overview.jobs.failed} failed`],
    ["Retried jobs", overview.jobs.retried, "Derived from recorded retry attempts"],
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value, meta]) => (
          <Panel key={String(label)}>
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <p className="mt-3 text-3xl font-semibold text-slate-950">{value}</p>
            <p className="mt-2 text-sm text-teal-700">{meta}</p>
          </Panel>
        ))}
      </div>
      <Panel>
        <h2 className="text-lg font-semibold text-slate-950">Processing status</h2>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div><dt className="text-sm text-slate-500">Pending</dt><dd className="mt-1 text-2xl font-semibold">{overview.jobs.pending}</dd></div>
          <div><dt className="text-sm text-slate-500">Running</dt><dd className="mt-1 text-2xl font-semibold text-sky-700">{overview.jobs.running}</dd></div>
          <div><dt className="text-sm text-slate-500">Completed</dt><dd className="mt-1 text-2xl font-semibold text-emerald-700">{overview.jobs.completed}</dd></div>
          <div><dt className="text-sm text-slate-500">Failed</dt><dd className="mt-1 text-2xl font-semibold text-red-700">{overview.jobs.failed}</dd></div>
        </dl>
      </Panel>
    </div>
  );
}

type AdminProcessingJob = {
  id: string;
  order_name: string;
  user: { email: string; name: string };
  service: string | null;
  status: string;
  queue_status: string;
  retry_count: number;
  max_retry_attempts: number;
  error_message: string | null;
  refunded: boolean;
  created_at: string;
};

type AdminProcessingJobResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: AdminProcessingJob[];
};

export function AdminProcessingJobsContent() {
  const [jobs, setJobs] = useState<AdminProcessingJob[]>([]);
  const [page, setPage] = useState(1);
  const [ordering, setOrdering] = useState("-created");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedJob, setSelectedJob] = useState<AdminProcessingJob | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [success, setSuccess] = useState("");

  const loadJobs = useCallback(async (nextPage = page) => {
    setLoading(true);
    setError("");
    try {
      const response = await apiRequest<AdminProcessingJobResponse>(`/api/v1/admin/jobs/?page=${nextPage}&page_size=25&ordering=${ordering}&search=${encodeURIComponent(appliedSearch)}`, { auth: true });
      setJobs(response.results);
      setHasNextPage(Boolean(response.next));
      setHasPreviousPage(Boolean(response.previous));
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, ordering, page]);

  useEffect(() => {
    void Promise.resolve().then(() => loadJobs(page));
  }, [loadJobs, page]);

  function changeOrdering(column: "created" | "job" | "status" | "user" | "retries") {
    setPage(1);
    setOrdering((current) => current === column ? `-${column}` : current === `-${column}` ? column : column);
  }


  async function retryJob() {
    if (!selectedJob) return;
    setRetrying(true);
    setError("");
    try {
      const result = await apiRequest<{ message?: string }>(`/api/v1/admin/jobs/${selectedJob.id}/retry/`, { auth: true, method: "POST" });
      setSuccess(result.message || "Job retry has been queued.");
      setSelectedJob(null);
      await loadJobs();
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setRetrying(false);
    }
  }

  return (
    <Panel>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-lg font-semibold text-slate-950">Processing jobs</h2><p className="mt-1 text-sm text-slate-500">Job retries use the protected server-side Celery workflow.</p></div>
        <div className="flex flex-wrap gap-2"><form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); setPage(1); setAppliedSearch(search.trim()); }}><Input aria-label="Search processing jobs" className="w-52" onChange={(event) => setSearch(event.target.value)} placeholder="Job, order, or user" value={search} /><Button type="submit" variant="outline">Search</Button></form><Button disabled={loading} onClick={() => void loadJobs()} type="button" variant="outline"><RefreshCw className={loading ? "animate-spin" : ""} /> Refresh</Button></div>
      </div>
      <div className="mt-4"><ErrorMessage message={error} /><SuccessMessage message={success} /></div>
      {loading ? <LoadingState label="Loading processing jobs..." /> : jobs.length === 0 ? (
        <EmptyState title="No processing jobs" description="No jobs are available for the selected view." />
      ) : (
        <div className="mt-4 overflow-x-auto"><Table><TableHeader><TableRow><TableHead><button className="font-medium hover:text-slate-950" onClick={() => changeOrdering("job")} type="button">Order name {ordering.includes("job") ? (ordering.startsWith("-") ? "↓" : "↑") : "↕"}</button></TableHead><TableHead><button className="font-medium hover:text-slate-950" onClick={() => changeOrdering("user")} type="button">User {ordering.includes("user") ? (ordering.startsWith("-") ? "↓" : "↑") : "↕"}</button></TableHead><TableHead>Service</TableHead><TableHead><button className="font-medium hover:text-slate-950" onClick={() => changeOrdering("created")} type="button">Created {ordering.includes("created") ? (ordering.startsWith("-") ? "↓" : "↑") : "↕"}</button></TableHead><TableHead><button className="font-medium hover:text-slate-950" onClick={() => changeOrdering("status")} type="button">Status {ordering.includes("status") ? (ordering.startsWith("-") ? "↓" : "↑") : "↕"}</button></TableHead><TableHead><button className="font-medium hover:text-slate-950" onClick={() => changeOrdering("retries")} type="button">Attempts {ordering.includes("retries") ? (ordering.startsWith("-") ? "↓" : "↑") : "↕"}</button></TableHead><TableHead><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader><TableBody>{jobs.map((job) => {
          const canRetry = job.status === "FAILED" && (!job.max_retry_attempts || job.retry_count < job.max_retry_attempts);
          return <TableRow key={job.id}><TableCell><p className="font-medium text-slate-950">{job.order_name || "Processing job"}</p><p className="mt-1 max-w-48 truncate text-xs text-slate-500" title={job.id}>{job.id}</p></TableCell><TableCell>{job.user.email}</TableCell><TableCell>{job.service || "Processing"}</TableCell><TableCell>{new Date(job.created_at).toLocaleString()}</TableCell><TableCell><StatusBadge status={statusLabel(job.status)} /></TableCell><TableCell>{job.retry_count} / {job.max_retry_attempts}</TableCell><TableCell className="text-right"><div className="flex justify-end gap-2"><Button asChild size="sm" variant="outline"><Link href={`/orders/${job.id}`}>Details</Link></Button>{job.status === "SUCCESS" ? <Button asChild size="sm"><Link href={`/orders/${job.id}/map`}>View result</Link></Button> : null}{job.status === "FAILED" && !job.refunded ? <Button asChild size="sm" variant="outline"><Link href={`/dashboard/orders/${job.id}/refund`}>Refund</Link></Button> : null}{canRetry ? <Button onClick={() => setSelectedJob(job)} size="sm" type="button" variant="outline"><RefreshCw /> Retry</Button> : null}</div></TableCell></TableRow>;
        })}</TableBody></Table></div>
      )}
      <div className="mt-5 flex justify-end gap-2"><Button disabled={!hasPreviousPage || loading} onClick={() => setPage((current) => Math.max(1, current - 1))} type="button" variant="outline">Previous</Button><Button disabled={!hasNextPage || loading} onClick={() => setPage((current) => current + 1)} type="button" variant="outline">Next</Button></div>
      <Dialog onOpenChange={(open) => { if (!open && !retrying) setSelectedJob(null); }} open={Boolean(selectedJob)}><DialogContent><DialogHeader><DialogTitle>Retry processing job?</DialogTitle><DialogDescription>This will queue a new Celery task for the failed job. It does not create a new order or charge the user again.</DialogDescription></DialogHeader>{selectedJob ? <div className="rounded-md bg-slate-50 p-4 text-sm text-slate-700"><p><strong>Job:</strong> {selectedJob.order_name}</p><p className="mt-1"><strong>User:</strong> {selectedJob.user.email}</p><p className="mt-1"><strong>Attempt:</strong> {selectedJob.retry_count + 1} of {selectedJob.max_retry_attempts}</p></div> : null}<div className="flex justify-end gap-3"><Button disabled={retrying} onClick={() => setSelectedJob(null)} type="button" variant="outline">Cancel</Button><Button disabled={retrying} onClick={() => void retryJob()} type="button">{retrying ? "Queueing..." : "Queue retry"}</Button></div></DialogContent></Dialog>
    </Panel>
  );
}

export function OrderStatusContent() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadOrders() {
      setError("");
      setLoading(true);

      try {
        const nextOrders = await fetchOrders(page);
        if (!active) {
          return;
        }

        setOrders(nextOrders.orders);
        setTotalCount(nextOrders.count);
        setHasNextPage(nextOrders.hasNextPage);
        setHasPreviousPage(nextOrders.hasPreviousPage);
      } catch (caught) {
        if (active) {
          setError(getErrorMessage(caught));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadOrders();

    return () => {
      active = false;
    };
  }, [page]);

  async function handleRefresh() {
    setError("");
    setRefreshing(true);

    try {
      const nextOrders = await fetchOrders(page);
      setOrders(nextOrders.orders);
      setTotalCount(nextOrders.count);
      setHasNextPage(nextOrders.hasNextPage);
      setHasPreviousPage(nextOrders.hasPreviousPage);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setRefreshing(false);
    }
  }

  const firstItem = totalCount === 0 ? 0 : (page - 1) * ORDERS_PAGE_SIZE + 1;
  const lastItem = Math.min(page * ORDERS_PAGE_SIZE, totalCount);

  return (
    <Panel>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Processing jobs</h2>
          <p className="mt-1 text-sm text-slate-500">
            {totalCount ? `${firstItem}-${lastItem} of ${totalCount}` : "No orders found"}
          </p>
        </div>
        <Button
          className="w-full sm:w-auto"
          disabled={loading || refreshing}
          onClick={handleRefresh}
          type="button"
          variant="outline"
        >
          <RefreshCw className={refreshing ? "animate-spin" : ""} />
          Refresh
        </Button>
      </div>
      <ErrorMessage message={error} />
      {loading ? (
        <div className="flex min-h-40 items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm font-medium text-slate-500">
          Loading orders...
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
          <h3 className="text-base font-semibold text-slate-950">No orders yet</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Submitted processing jobs will appear here.
          </p>
        </div>
      ) : (
        <>
      <div className="hidden overflow-x-auto md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead>Amount (USD)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="max-w-56">
                  <p className="font-semibold text-slate-950">{order.name}</p>
                  <p className="mt-1 break-all text-xs text-slate-500">{order.id}</p>
                </TableCell>
                <TableCell className="text-slate-600">{order.service}</TableCell>
                <TableCell className="text-slate-600">{order.date}</TableCell>
                <TableCell className="text-slate-600">{order.processingAmountUsd}</TableCell>
                <TableCell><StatusBadge status={order.status} /></TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/orders/${order.id}`}>
                        <ExternalLink />
                        Details
                      </Link>
                    </Button>
                    {order.isComplete ? (
                      <Button
                        asChild
                        className="bg-emerald-600 text-white hover:bg-emerald-700"
                        size="sm"
                      >
                        <Link href={`/orders/${order.id}/map`}>
                          <ExternalLink />
                          View and Download Data
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="space-y-3 md:hidden">
        {orders.map((order) => (
          <div className="rounded-lg border border-slate-200 p-4" key={order.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-950">{order.name}</p>
                <p className="mt-1 break-all text-xs text-slate-500">{order.id}</p>
                <p className="mt-1 text-sm text-slate-600">{order.service}</p>
              </div>
              <StatusBadge status={order.status} />
            </div>
            <div className="mt-4 flex justify-between text-sm text-slate-600">
              <span>{order.date}</span>
              <span className="font-medium text-slate-950">{order.amount}</span>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <Button asChild className="w-full" variant="outline">
                <Link href={`/orders/${order.id}`}>
                  <ExternalLink />
                  View order
                </Link>
              </Button>
              {order.isComplete ? (
                <Button
                  asChild
                  className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  <Link href={`/orders/${order.id}/map`}>
                    <ExternalLink />
                    View and Download Data
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      <Pagination className="mt-5">
        <PaginationInfo>
          {totalCount ? `${firstItem}-${lastItem} of ${totalCount}` : "No orders"}
        </PaginationInfo>
        <PaginationContent>
          <Button
            disabled={!hasPreviousPage || loading}
            onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
            size="icon-sm"
            type="button"
            variant="outline"
          >
            <ChevronLeft />
            <span className="sr-only">Previous page</span>
          </Button>
          <Button
            disabled={!hasNextPage || loading}
            onClick={() => setPage((currentPage) => currentPage + 1)}
            size="icon-sm"
            type="button"
            variant="outline"
          >
            <ChevronRight />
            <span className="sr-only">Next page</span>
          </Button>
        </PaginationContent>
      </Pagination>
        </>
      )}
    </Panel>
  );
}

export function WalletContent() {
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [transactions, setTransactions] = useState<WalletTransactionRow[]>([]);
  const [error, setError] = useState("");
  const [transactionError, setTransactionError] = useState("");
  const [loading, setLoading] = useState(true);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [topUpOpen, setTopUpOpen] = useState(false);
  const currentBalance = toNumber(
    balance?.balance_display ?? balance?.current_balance ?? balance?.token ?? balance?.balance,
  );
  const userLabel =
    balance?.user_detail
      ? balance.user_detail.email || balance.user_detail.full_name || balance.user_detail.fullName || balance.user_detail.name
      : balance?.user && typeof balance.user === "object"
        ? balance.user.email || balance.user.full_name || balance.user.fullName || balance.user.name
      : null;

  async function loadBalance() {
    setError("");
    setLoading(true);

    try {
      const response = await apiRequest<WalletBalanceResponse>("/api/v1/balance/", { auth: true });
      setBalance(getWalletBalanceItem(response));
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  async function loadTransactions() {
    setTransactionError("");
    setTransactionsLoading(true);

    try {
      const response = await apiRequest<WalletTransactionResponse>(walletTransactionsPath, { auth: true });
      setTransactions(getWalletTransactions(response).map(toWalletTransactionRow));
    } catch (caught) {
      setTransactionError(getErrorMessage(caught));
      setTransactions([]);
    } finally {
      setTransactionsLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(() => {
      void loadBalance();
      void loadTransactions();
    });
  }, []);

  async function handleTopUpSuccess() {
    await Promise.all([loadBalance(), loadTransactions()]);
    setTopUpOpen(false);
  }

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <Panel>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">Current Balance</p>
              <p className="mt-4 text-4xl font-semibold">
                {loading ? "Loading..." : formatCurrency(currentBalance)}
              </p>
            </div>
            <div className="rounded-full bg-teal-50 p-3">
              <Wallet className="size-6 text-teal-600" />
            </div>
          </div>

          {userLabel ? <p className="mt-3 text-sm text-slate-500">{userLabel}</p> : null}
          {error ? <Alert className="mt-5" variant="destructive">{error}</Alert> : null}

          <div className="mt-8 grid gap-3">
            <Button
              className="h-11 bg-slate-950 font-semibold text-white hover:bg-slate-800"
              disabled={loading}
              onClick={() => setTopUpOpen(true)}
              type="button"
            >
              <CreditCard />
              Top up
            </Button>
            <Button
              className="h-11"
              disabled
              title="Withdrawals are not available from the current backend."
              type="button"
              variant="outline"
            >
              Withdraw
            </Button>
          </div>

      </Panel>
      <Panel>
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-950">Recent transactions</h2>
          <Button
            disabled={transactionsLoading}
            onClick={() => void loadTransactions()}
            size="sm"
            type="button"
            variant="outline"
          >
            <RefreshCw className={transactionsLoading ? "animate-spin" : ""} />
            Refresh
          </Button>
        </div>
        {transactionError ? <Alert className="mt-4" variant="destructive">{transactionError}</Alert> : null}
        <div className="mt-4 divide-y divide-slate-100">
          {transactionsLoading ? (
            <LoadingState label="Loading transactions..." />
          ) : transactions.length ? (
            transactions.map((transaction) => (
              <div className="flex items-center justify-between gap-4 py-4" key={transaction.id}>
                <div>
                  <p className="font-medium capitalize text-slate-950">{transaction.label.replaceAll("_", " ")}</p>
                  <p className="mt-1 text-sm text-slate-500">{transaction.date}</p>
                </div>
                <p
                  className={`text-sm font-semibold ${
                    transaction.kind === "debit"
                      ? "text-red-600"
                      : transaction.kind === "credit"
                        ? "text-emerald-700"
                        : "text-slate-700"
                  }`}
                >
                  {transaction.kind === "credit" ? "+" : ""}
                  {formatCurrency(transaction.amount)}
                </p>
              </div>
            ))
          ) : (
            <EmptyState
              title="No recent transactions"
              description="Top-ups and wallet usage will appear here when the backend returns them."
            />
          )}
        </div>
      </Panel>
      </div>
      <WalletTopUpDialog
        balance={currentBalance}
        onOpenChange={setTopUpOpen}
        onPaymentSuccess={handleTopUpSuccess}
        open={topUpOpen}
      />
    </>
  );
}

function WalletTopUpDialog({
  balance,
  onOpenChange,
  onPaymentSuccess,
  open,
}: {
  balance: number;
  onOpenChange: (open: boolean) => void;
  onPaymentSuccess: () => Promise<void>;
  open: boolean;
}) {
  const cardNumberMountRef = useRef<HTMLDivElement | null>(null);
  const cardExpiryMountRef = useRef<HTMLDivElement | null>(null);
  const cardCvcMountRef = useRef<HTMLDivElement | null>(null);
  const cardNumberElementRef = useRef<StripeCardNumberElement | null>(null);
  const cardExpiryElementRef = useRef<StripeCardExpiryElement | null>(null);
  const cardCvcElementRef = useRef<StripeCardCvcElement | null>(null);
  const stripeRef = useRef<Stripe | null>(null);
  const [amount, setAmount] = useState("50");
  const [fullName, setFullName] = useState("");
  const [country, setCountry] = useState("NP");
  const [readyFields, setReadyFields] = useState({ cvc: false, expiry: false, number: false });
  const [cardError, setCardError] = useState("");
  const [stripeError, setStripeError] = useState(stripePromise ? "" : "Stripe publishable key is missing.");
  const [paying, setPaying] = useState(false);
  const amountNumber = useMemo(() => toNumber(amount), [amount]);
  const cardReady = readyFields.cvc && readyFields.expiry && readyFields.number;
  const minimumTopUpAmount = 25;
  const canPay = amountNumber >= minimumTopUpAmount && cardReady && !paying;

  useEffect(() => {
    let active = true;

    if (!open || !stripePromise) {
      return;
    }

    stripePromise
      .then((stripe) => {
        if (!active || !stripe || !cardNumberMountRef.current || !cardExpiryMountRef.current || !cardCvcMountRef.current) {
          return;
        }

        const elements = stripe.elements();
        const elementOptions = {
          style: {
            base: {
              color: "#0f172a",
              fontFamily: "inherit",
              fontSize: "16px",
              fontSmoothing: "antialiased",
              "::placeholder": {
                color: "#64748b",
              },
            },
            invalid: {
              color: "#dc2626",
            },
          },
        };
        const cardNumber = elements.create("cardNumber", {
          ...elementOptions,
          showIcon: true,
        });
        const cardExpiry = elements.create("cardExpiry", elementOptions);
        const cardCvc = elements.create("cardCvc", elementOptions);
        const handleChange = (event: { error?: { message?: string } }) => {
          setCardError(event.error?.message || "");
        };

        cardNumber.mount(cardNumberMountRef.current);
        cardExpiry.mount(cardExpiryMountRef.current);
        cardCvc.mount(cardCvcMountRef.current);
        cardNumber.on("change", handleChange);
        cardExpiry.on("change", handleChange);
        cardCvc.on("change", handleChange);
        cardNumber.on("ready", () => setReadyFields((fields) => ({ ...fields, number: true })));
        cardExpiry.on("ready", () => setReadyFields((fields) => ({ ...fields, expiry: true })));
        cardCvc.on("ready", () => setReadyFields((fields) => ({ ...fields, cvc: true })));

        stripeRef.current = stripe;
        cardNumberElementRef.current = cardNumber;
        cardExpiryElementRef.current = cardExpiry;
        cardCvcElementRef.current = cardCvc;
      })
      .catch(() => {
        if (active) {
          setStripeError("Unable to load Stripe.");
        }
      });

    return () => {
      active = false;
      cardNumberElementRef.current?.destroy();
      cardExpiryElementRef.current?.destroy();
      cardCvcElementRef.current?.destroy();
      cardNumberElementRef.current = null;
      cardExpiryElementRef.current = null;
      cardCvcElementRef.current = null;
      stripeRef.current = null;
      setReadyFields({ cvc: false, expiry: false, number: false });
      setCardError("");
    };
  }, [open]);

  async function createPaymentIntent() {
    const data = await apiRequest<{
      clientSecret?: string;
      client_secret?: string;
      paymentIntentId?: string;
      payment_intent_id?: string;
    }>(walletTopUpIntentPath, {
      auth: true,
      body: JSON.stringify({
        amount: amountNumber,
        purpose: "wallet_topup",
      }),
      method: "POST",
    });
    const clientSecret = data.clientSecret || data.client_secret;

    if (!clientSecret) {
      throw new Error("Stripe payment did not return a client secret.");
    }

    return {
      clientSecret,
      paymentIntentId: data.paymentIntentId || data.payment_intent_id,
    };
  }

  async function handlePay() {
    const stripe = stripeRef.current;
    const cardNumber = cardNumberElementRef.current;

    if (!stripe || !cardNumber) {
      setStripeError("Stripe card details are not ready yet.");
      return;
    }

    if (amountNumber < minimumTopUpAmount) {
      setStripeError(`Enter a top-up amount of at least ${formatCurrency(minimumTopUpAmount)}.`);
      return;
    }

    setPaying(true);
    setStripeError("");
    setCardError("");

    try {
      const { clientSecret, paymentIntentId } = await createPaymentIntent();
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          billing_details: {
            address: {
              country,
            },
            name: fullName.trim() || undefined,
          },
          card: cardNumber,
        },
      });

      if (result.error) {
        throw new Error(result.error.message || "Payment could not be completed.");
      }

      if (result.paymentIntent?.status !== "succeeded") {
        throw new Error("Payment is not complete yet. Please try again.");
      }

      await apiRequest(walletTopUpConfirmPath, {
        auth: true,
        body: JSON.stringify({
          paymentIntentId: paymentIntentId || result.paymentIntent.id,
        }),
        method: "POST",
      });

      await onPaymentSuccess();
    } catch (caught) {
      setStripeError(caught instanceof Error ? caught.message : "Payment could not be completed.");
    } finally {
      setPaying(false);
    }
  }

  return (
    <Dialog onOpenChange={paying ? undefined : onOpenChange} open={open}>
      <DialogContent className="max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] !max-w-4xl overflow-y-auto p-0">
        <div className="grid overflow-hidden rounded-xl md:grid-cols-[18rem_minmax(0,1fr)]">
          <div className="bg-slate-950 p-6 text-white md:min-h-[34rem]">
            <div className="flex items-center justify-between gap-3">
              <div className="rounded-lg bg-white/10 p-3">
                <Wallet className="size-6 text-teal-300" />
              </div>
              <Button
                className="text-white hover:bg-white/10 hover:text-white md:hidden"
                disabled={paying}
                onClick={() => onOpenChange(false)}
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <X />
                <span className="sr-only">Close</span>
              </Button>
            </div>
            <p className="mt-8 text-sm text-slate-300">Current Balance</p>
            <p className="mt-2 text-3xl font-semibold">{formatCurrency(balance)}</p>
            <div className="mt-8 rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">Top-up amount</p>
              <p className="mt-1 text-2xl font-semibold">{formatCurrency(amountNumber)}</p>
            </div>
          </div>

          <div className="min-w-0 p-5 sm:p-6">
            <DialogHeader className="text-left">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <DialogTitle>Top up wallet</DialogTitle>
                  <DialogDescription>Add funds securely with Stripe.</DialogDescription>
                </div>
                <Button
                  className="hidden md:inline-flex"
                  disabled={paying}
                  onClick={() => onOpenChange(false)}
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                >
                  <X />
                  <span className="sr-only">Close</span>
                </Button>
              </div>
            </DialogHeader>

            <div className="mt-6 space-y-4">
              <div>
                <span className="text-sm font-medium text-slate-700">Top-up amount</span>
                <label className="mt-2 flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 shadow-sm transition focus-within:border-slate-950 focus-within:ring-2 focus-within:ring-slate-950/10">
                  <span className="text-sm font-semibold text-slate-500">USD</span>
                  <input
                    className="h-11 min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-950 outline-none"
                    disabled={paying}
                    list="wallet-top-up-presets"
                    min={minimumTopUpAmount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="Enter an amount or choose a preset"
                    step="0.01"
                    type="number"
                    value={amount}
                  />
                  <datalist id="wallet-top-up-presets">
                    {topUpAmounts.map((topUpAmount) => <option key={topUpAmount} value={topUpAmount}>{formatCurrency(topUpAmount)}</option>)}
                  </datalist>
                </label>
                {amountNumber > 0 && amountNumber < minimumTopUpAmount ? <p className="mt-2 text-xs font-medium text-red-600">Minimum top-up is {formatCurrency(minimumTopUpAmount)}.</p> : <p className="mt-2 text-xs text-slate-500">Enter a custom amount or select a preset. Minimum {formatCurrency(minimumTopUpAmount)}.</p>}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Full name</span>
                  <Input
                    className="mt-2 h-11"
                    disabled={paying}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Name on card"
                    value={fullName}
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Country or region</span>
                  <select
                    className="mt-2 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none transition focus:border-slate-950"
                    disabled={paying}
                    onChange={(event) => setCountry(event.target.value)}
                    value={country}
                  >
                    {countryOptions.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="rounded-lg border border-slate-200 p-4">
                <div className="rounded-md bg-slate-50 px-3 py-3">
                  <span className="block text-xs font-medium text-slate-500">Card number</span>
                  <div className="mt-2 min-h-6" ref={cardNumberMountRef} />
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-md bg-slate-50 px-3 py-3">
                    <span className="block text-xs font-medium text-slate-500">Expiration</span>
                    <div className="mt-2 min-h-6" ref={cardExpiryMountRef} />
                  </div>
                  <div className="rounded-md bg-slate-50 px-3 py-3">
                    <span className="block text-xs font-medium text-slate-500">CVC</span>
                    <div className="mt-2 min-h-6" ref={cardCvcMountRef} />
                  </div>
                </div>
              </div>

              {cardError ? <p className="text-sm font-medium text-red-600">{cardError}</p> : null}
              {stripeError ? <Alert variant="destructive">{stripeError}</Alert> : null}

              <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
                <Button
                  className="h-11"
                  disabled={paying}
                  onClick={() => onOpenChange(false)}
                  type="button"
                  variant="outline"
                >
                  Close
                </Button>
                <Button
                  className="h-11 w-full bg-slate-950 font-semibold text-white hover:bg-slate-800"
                  disabled={!canPay}
                  onClick={handlePay}
                  type="button"
                >
                  {paying ? <LoaderCircle className="animate-spin" /> : <CreditCard />}
                  {paying ? "Processing..." : `Top up ${formatCurrency(amountNumber)}`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ProfileContent() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    apiRequest<Profile>("/api/auth/profile/", { auth: true })
      .then(setProfile)
      .catch((caught) => setError(getErrorMessage(caught)))
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    const form = new FormData(event.currentTarget);

    try {
      const updated = await apiRequest<Profile>("/api/auth/profile/", {
        method: "PATCH",
        auth: true,
        body: JSON.stringify({
          full_name: form.get("full_name"),
          affiliation: form.get("affiliation"),
          email: form.get("email"),
        }),
      });
      setProfile(updated);
      setSuccess("Profile updated successfully.");
      setIsEditing(false);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingState label="Loading profile..." />;
  }

  return (
    <Panel>
      <ErrorMessage message={error} />
      <SuccessMessage message={success} />

      {isEditing ? (
        <form className="mt-5 space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField label="Full name" name="full_name" defaultValue={profile?.full_name || profile?.name || ""} />
            <TextField label="Affiliation" name="affiliation" defaultValue={profile?.affiliation || ""} />
            <TextField label="Email" name="email" defaultValue={profile?.email || ""} type="email" />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <SubmitButton loading={saving}>Save profile</SubmitButton>
            <Button
              className="w-full sm:w-auto"
              disabled={saving}
              onClick={() => setIsEditing(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="mt-5">
          <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-slate-500">Full name</dt>
              <dd className="mt-1 text-base font-medium text-slate-950">
                {profile?.full_name || profile?.name || "Not provided"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-500">Affiliation</dt>
              <dd className="mt-1 text-base font-medium text-slate-950">
                {profile?.affiliation || "Not provided"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-slate-500">Email</dt>
              <dd className="mt-1 break-words text-base font-medium text-slate-950">
                {profile?.email || "Not provided"}
              </dd>
            </div>
          </dl>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              className="w-full sm:w-auto"
              onClick={() => {
                setError("");
                setSuccess("");
                setIsEditing(true);
              }}
              type="button"
            >
              Edit profile
            </Button>
            <Button asChild className="w-full sm:w-auto" variant="outline">
              <Link href="/change-password">Change password</Link>
            </Button>
          </div>
        </div>
      )}
    </Panel>
  );
}

export function ChangePasswordContent() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const hasConfirmPassword = confirmPassword.length > 0;
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const passwordMismatch = hasConfirmPassword && newPassword !== confirmPassword;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("New password and confirm password must match exactly.");
      return;
    }

    setLoading(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    try {
      await apiRequest("/api/auth/change-password/", {
        method: "POST",
        auth: true,
        body: JSON.stringify({
          old_password: form.get("currentPassword"),
          new_password: form.get("newPassword"),
          confirm_password: form.get("confirmPassword"),
        }),
      });
      setSuccess("Password changed successfully.");
      setNewPassword("");
      setConfirmPassword("");
      formElement.reset();
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Panel className="max-w-2xl">
      <form className="space-y-5" onSubmit={handleSubmit}>
        <ErrorMessage message={error} />
        <SuccessMessage message={success} />
        <TextField label="Current password" name="currentPassword" required type="password" />
        <TextField
          label="New password"
          name="newPassword"
          onChange={(event) => setNewPassword(event.target.value)}
          required
          type="password"
          value={newPassword}
        />
        <div>
          <TextField
            aria-invalid={passwordMismatch}
            label="Confirm new password"
            name="confirmPassword"
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            type="password"
            value={confirmPassword}
          />
          {hasConfirmPassword ? (
            <p className={`mt-2 text-xs font-medium ${passwordsMatch ? "text-emerald-700" : "text-red-700"}`}>
              {passwordsMatch ? "Passwords match exactly." : "Passwords do not match."}
            </p>
          ) : null}
        </div>
        <SubmitButton loading={loading}>Change password</SubmitButton>
      </form>
    </Panel>
  );
}

export { PageHeader };
