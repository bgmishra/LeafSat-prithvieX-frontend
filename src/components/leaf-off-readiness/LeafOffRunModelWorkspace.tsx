"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Crosshair, FlaskConical, List, Loader2, Map as MapIcon, Play, RotateCw, Search, TrainFront, X } from "lucide-react";
import { ApiError, getErrorMessage } from "@/api/client";
import { useAuthUser } from "@/admin/hooks/useAuthUser";
import { useToast } from "@/admin/components/ToastProvider";
import { SectionSelectionMap, type SelectableSection } from "@/components/leaf-off/SectionSelectionMap";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectOption } from "@/components/ui/select";
import { formatRelative, isToday } from "@/lib/format";
import {
  MAX_SECTIONS_PER_RUN,
  createModelRun,
  getModelRun,
  getSceneSearch,
  isActiveRunStatus,
  listRunnableSections,
  type ModelRunDetail,
  type RunnableSection,
  type SceneSearch,
} from "@/lib/model-runs";
import { cn } from "@/lib/utils";
import { useAuth } from "@/store/auth-provider";
import { IconEmptyState } from "./IconEmptyState";
import { useModelProduct } from "./model-product";
import { PRIMARY_BUTTON_CLASS, RunStatusPanel, runHeadline } from "./RunStatusPanel";
import { usePolling } from "./usePolling";

function primaryLine(section: RunnableSection) {
  const id = section.railway_id || `Section #${section.id}`;
  return section.railway_name ? `${id} · ${section.railway_name}` : id;
}

function routeLine(section: RunnableSection) {
  return section.section_start_name && section.section_end_name
    ? `${section.section_start_name} → ${section.section_end_name}`
    : "";
}

function shortLabel(section: RunnableSection) {
  const id = section.railway_id || section.railway_name || `Section #${section.id}`;
  const route = routeLine(section);
  return route ? `${id} · ${route}` : id;
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

function compareSections(a: RunnableSection, b: RunnableSection) {
  return (
    collator.compare(a.railway_name || "", b.railway_name || "") ||
    collator.compare(a.railway_id || "", b.railway_id || "") ||
    a.id - b.id
  );
}

function matchesSearch(section: RunnableSection, query: string) {
  if (!query) {
    return true;
  }
  return [
    section.railway_id,
    section.railway_name,
    section.section_start_name,
    section.section_end_name,
    section.starting_point_name,
    section.end_point_name,
  ].some((value) => value?.toLowerCase().includes(query));
}

function readStoredRunId(storageKey: string) {
  try {
    const value = window.sessionStorage.getItem(storageKey);
    const id = value ? Number(value) : NaN;
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

function storeRunId(storageKey: string, id: number | null) {
  try {
    if (id) {
      window.sessionStorage.setItem(storageKey, String(id));
    } else {
      window.sessionStorage.removeItem(storageKey);
    }
  } catch {
    // Storage can be unavailable (private mode); the panel is a convenience.
  }
}

function submitErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 403) {
      return "You don't have permission to run the model. Ask your client super admin.";
    }
    if (error.status === 400 && error.payload) {
      const sectionErrors = error.payload.section_ids;
      if (Array.isArray(sectionErrors) && sectionErrors.length > 0) {
        return `Some sections can't be run: ${sectionErrors.join(" ")} They may have been archived or are no longer approved. Deselect them and try again.`;
      }
      return getErrorMessage(error);
    }
    if (error.status >= 500 || error.status === 0) {
      return "We couldn't start the run. Nothing was queued. Try again in a moment.";
    }
    return getErrorMessage(error);
  }
  return "We couldn't start the run. Nothing was queued. Try again in a moment.";
}

/** Ids the server rejected as not found / not approved / archived, parsed from its messages. */
function rejectedIds(error: unknown) {
  if (!(error instanceof ApiError) || error.status !== 400) {
    return [];
  }
  const messages = error.payload?.section_ids;
  if (!Array.isArray(messages)) {
    return [];
  }
  const ids = new Set<number>();
  for (const message of messages) {
    for (const match of String(message).matchAll(/\d+/g)) {
      ids.add(Number(match[0]));
    }
  }
  return [...ids];
}

function RunHint({ section }: { section: RunnableSection }) {
  if (section.active_run) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200">
        <Loader2 aria-hidden="true" className="size-3 motion-safe:animate-spin motion-reduce:animate-none" />
        Processing · run #{section.active_run.id}
      </span>
    );
  }
  if (section.last_run) {
    const today = isToday(section.last_run.finished_at);
    return (
      <span
        className={cn(
          "text-[11px]",
          today ? "font-semibold text-amber-800" : "text-slate-500",
        )}
        title={section.last_run.finished_at ? new Date(section.last_run.finished_at).toLocaleString() : undefined}
      >
        {today ? `Run today · #${section.last_run.id}` : `Last run ${formatRelative(section.last_run.finished_at)}`}
      </span>
    );
  }
  return null;
}

/**
 * Product-specific additions to the Run page, e.g. the forecast horizon.
 * The wrapper owns the state; this workspace only places the pieces.
 */
export type RunModelExtension = {
  /** Shown under the page description, above the section list. */
  controls?: React.ReactNode;
  /** Shown at the top of the confirm dialog, under its description. */
  confirmSummary?: React.ReactNode;
  /** Extra fields for `POST /model-runs/`. */
  createOptions?: { forecastHorizonDays?: number };
  /** Disables Process / Start run while the extension is not ready. */
  blocked?: boolean;
};

/**
 * Run Model: pick approved sections (list + map, kept in sync), confirm, POST,
 * then follow the run in a status panel until it finishes. Product wording and
 * `model_type` come from `useModelProduct()`.
 */
export function LeafOffRunModelWorkspace({ extension }: { extension?: RunModelExtension } = {}) {
  const product = useModelProduct();
  const { modelType, runPage } = product;
  const storageKey = runPage.lastRunStorageKey;
  const { isAuthenticated, isReady } = useAuth();
  const { isAdmin, user } = useAuthUser({ enabled: isAuthenticated });
  const { notify } = useToast();
  const listId = useId();
  const helperId = useId();

  const [sections, setSections] = useState<RunnableSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [railway, setRailway] = useState("");
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [flashId, setFlashId] = useState<number | null>(null);
  const [focusRequest, setFocusRequest] = useState<{ id: number; nonce: number } | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [run, setRun] = useState<ModelRunDetail | null>(null);
  const [pollError, setPollError] = useState(false);
  const [sceneSearch, setSceneSearch] = useState<SceneSearch | null>(null);
  const selectAllRef = useRef<HTMLInputElement | null>(null);
  const startButtonRef = useRef<HTMLButtonElement | null>(null);
  const announcedStatusRef = useRef<string | null>(null);
  const flashTimerRef = useRef<number | undefined>(undefined);

  const loadSections = useCallback(() => {
    return listRunnableSections({ modelType })
      .then((items) => {
        setSections(items);
        setLoadError("");
      })
      .catch((caught) => setLoadError(getErrorMessage(caught)))
      .finally(() => setLoading(false));
  }, [modelType]);

  useEffect(() => {
    if (!isReady || !isAuthenticated) {
      return;
    }
    let active = true;
    // active_run / last_run are per model type, so always ask for this product's.
    listRunnableSections({ modelType })
      .then((items) => {
        if (active) {
          setSections(items);
          setLoadError("");
        }
      })
      .catch((caught) => {
        if (active) {
          setLoadError(getErrorMessage(caught));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    // Only feeds the confirm dialog's wording; the dialog still works without it.
    if (runPage.usesSceneSearch) {
      getSceneSearch()
        .then((search) => {
          if (active) {
            setSceneSearch(search);
          }
        })
        .catch(() => undefined);
    }

    // Bring back the panel for a run started earlier in this tab.
    const storedId = readStoredRunId(storageKey);
    if (storedId) {
      getModelRun(storedId)
        .then((detail) => {
          if (active) {
            announcedStatusRef.current = detail.status;
            setRun(detail);
          }
        })
        .catch(() => storeRunId(storageKey, null));
    }

    return () => {
      active = false;
    };
  }, [isAuthenticated, isReady, modelType, runPage.usesSceneSearch, storageKey]);

  // Debounce the search box so the list and map don't churn on each keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(searchInput.trim().toLowerCase()), 150);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => () => window.clearTimeout(flashTimerRef.current), []);

  const sorted = useMemo(() => [...sections].sort(compareSections), [sections]);
  const railways = useMemo(
    () => [...new Set(sections.map((section) => section.railway_name).filter(Boolean))].sort(collator.compare),
    [sections],
  );
  const organizations = useMemo(() => new Set(sections.map((section) => section.organization)), [sections]);
  const showOrganization = isAdmin || organizations.size > 1;

  const shown = useMemo(
    () => sorted.filter((section) => (!railway || section.railway_name === railway) && matchesSearch(section, query)),
    [query, railway, sorted],
  );
  const shownIds = useMemo(() => new Set(shown.map((section) => section.id)), [shown]);

  // Selection is resolved against the latest list, so stale ids drop out after a refresh.
  const selectedSections = useMemo(() => sorted.filter((section) => selected.has(section.id)), [selected, sorted]);
  const selectedIds = useMemo(() => new Set(selectedSections.map((section) => section.id)), [selectedSections]);
  const selectedCount = selectedSections.length;
  const hiddenSelected = selectedSections.filter((section) => !shownIds.has(section.id)).length;
  const shownSelected = shown.filter((section) => selectedIds.has(section.id)).length;
  const allShownSelected = shown.length > 0 && shownSelected === shown.length;
  const someShownSelected = shownSelected > 0 && !allShownSelected;

  const selectedOrgs = new Set(selectedSections.map((section) => section.organization));
  const mixedOrganizations = selectedOrgs.size > 1;
  const tooMany = selectedCount > MAX_SECTIONS_PER_RUN;
  const alreadyProcessing = selectedSections.filter((section) => section.active_run);
  const ranToday = selectedSections.filter(
    (section) => !section.active_run && section.last_run && isToday(section.last_run.finished_at),
  );
  const activeRunIds = [...new Set(alreadyProcessing.map((section) => section.active_run?.id))];
  const canProcess = selectedCount > 0 && !mixedOrganizations && !tooMany && !submitting && !extension?.blocked;

  const mapSections = useMemo<SelectableSection[]>(
    () => sections.map((section) => ({ id: section.id, label: shortLabel(section), section_polygon: section.section_polygon })),
    [sections],
  );

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someShownSelected;
    }
  }, [someShownSelected]);

  const toggle = useCallback((id: number) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleFromMap = useCallback(
    (id: number) => {
      toggle(id);
      document.getElementById(`${listId}-row-${id}`)?.scrollIntoView({ block: "nearest" });
      setFlashId(id);
      window.clearTimeout(flashTimerRef.current);
      flashTimerRef.current = window.setTimeout(() => setFlashId(null), 1000);
    },
    [listId, toggle],
  );

  const toggleAllShown = () => {
    setSelected((current) => {
      const next = new Set(current);
      if (allShownSelected) {
        shown.forEach((section) => next.delete(section.id));
      } else {
        shown.forEach((section) => next.add(section.id));
      }
      return next;
    });
  };

  const clearFilters = () => {
    setSearchInput("");
    setQuery("");
    setRailway("");
  };

  // Poll the run while it is queued or running.
  const pollRun = useCallback(async () => {
    if (!run) {
      return;
    }
    try {
      const detail = await getModelRun(run.id);
      setRun(detail);
      setPollError(false);
    } catch {
      setPollError(true);
    }
  }, [run]);
  usePolling(pollRun, Boolean(run && isActiveRunStatus(run.status)));

  // Toast once when a followed run reaches a terminal state, and refresh the
  // list so its "processing" flags clear.
  useEffect(() => {
    if (!run || announcedStatusRef.current === run.status) {
      return;
    }
    const previous = announcedStatusRef.current;
    announcedStatusRef.current = run.status;
    if (!previous || !run.is_finished) {
      return;
    }
    if (run.status === "succeeded") {
      notify({ title: `Run #${run.id} finished.`, type: "success" });
    } else {
      notify({ title: `${runHeadline(run)}.`, type: "error" });
    }
    void loadSections();
  }, [loadSections, notify, run]);

  const startRun = async () => {
    setSubmitting(true);
    setSubmitError("");
    try {
      const created = await createModelRun(
        selectedSections.map((section) => section.id),
        modelType,
        extension?.createOptions,
      );
      announcedStatusRef.current = created.status;
      setRun(created);
      setPollError(false);
      storeRunId(storageKey, created.id);
      setSelected(new Set());
      setConfirmOpen(false);
      if (created.status === "failed") {
        notify({ title: `Run #${created.id} failed.`, type: "error" });
      } else {
        notify({ title: `Run #${created.id} queued.`, type: "success" });
      }
      void loadSections();
    } catch (caught) {
      setSubmitError(submitErrorMessage(caught));
      const stale = rejectedIds(caught);
      if (stale.length > 0) {
        void loadSections();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const dismissRun = () => {
    setRun(null);
    setPollError(false);
    storeRunId(storageKey, null);
    announcedStatusRef.current = null;
  };

  const processLabel = submitting
    ? "Starting…"
    : selectedCount === 0
      ? "Process"
      : `Process ${selectedCount} section${selectedCount === 1 ? "" : "s"}`;

  const countsText =
    shown.length === sections.length
      ? `${sections.length} section${sections.length === 1 ? "" : "s"} · ${selectedCount} selected`
      : `${shown.length} of ${sections.length} sections · ${selectedCount} selected${hiddenSelected ? ` (${hiddenSelected} not shown)` : ""}`;

  if (isReady && !isAuthenticated) {
    return (
      <div className="p-4 sm:p-6">
        <IconEmptyState
          action={
            <Link className={buttonVariants({ className: PRIMARY_BUTTON_CLASS })} href="/login">
              Sign in
            </Link>
          }
          description="Your company's approved train sections appear here once you sign in."
          icon={TrainFront}
          title={runPage.signInTitle}
        />
      </div>
    );
  }

  const canManageSections = user?.role === "client_super_admin" || user?.role === "engineer";
  const listHidden = mobileView === "map" ? "max-lg:hidden" : "";

  return (
    <div className="min-h-[calc(100vh-2rem)] overflow-visible lg:h-[calc(100dvh-0.3rem)] lg:min-h-0 lg:overflow-hidden lg:px-4 lg:py-4">
      <div className="grid min-h-full gap-4 p-3 pb-28 lg:h-full lg:grid-cols-[440px_minmax(0,1fr)] lg:p-0">
        <div className="flex flex-col rounded-lg border border-slate-200 bg-white shadow-sm lg:min-h-0 lg:overflow-hidden">
          <div className="order-1 border-b border-slate-200 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">{product.name}</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{runPage.title}</h1>
            <p className="mt-2 text-sm text-slate-500">{runPage.description}</p>
            {extension?.controls ? <div className="mt-4">{extension.controls}</div> : null}
          </div>

          {/* Mobile: switch between the list and the map. */}
          <div aria-label="View" className="order-2 flex gap-1 border-b border-slate-200 px-4 lg:hidden" role="tablist">
            {(["list", "map"] as const).map((view) => (
              <button
                aria-selected={mobileView === view}
                className={cn(
                  "-mb-px flex min-h-11 items-center gap-2 border-b-2 px-4 text-sm font-semibold transition-colors",
                  mobileView === view ? "border-teal-700 text-teal-700" : "border-transparent text-slate-500 hover:text-slate-800",
                )}
                key={view}
                onClick={() => setMobileView(view)}
                role="tab"
                type="button"
              >
                {view === "list" ? <List aria-hidden="true" className="size-4" /> : <MapIcon aria-hidden="true" className="size-4" />}
                {view === "list" ? "List" : "Map"}
              </button>
            ))}
          </div>

          {loadError ? (
            <div className="order-3 border-b border-slate-200 px-5 py-3">
              <Alert className="space-y-2" role="alert" variant="destructive">
                <p>We couldn&apos;t load your train sections. Check your connection and try again.</p>
                {loadError ? <p className="text-xs opacity-80">{loadError}</p> : null}
                <Button
                  onClick={() => {
                    setLoading(true);
                    void loadSections();
                  }}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <RotateCw aria-hidden="true" />
                  Retry
                </Button>
              </Alert>
            </div>
          ) : null}

          {sections.length > 0 ? (
            <div className={cn("order-3 space-y-3 border-b border-slate-200 px-5 py-4", listHidden)}>
              <div className="relative">
                <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <label className="sr-only" htmlFor={`${listId}-search`}>
                  Search sections
                </label>
                <Input
                  className="pl-9 pr-10 [&::-webkit-search-cancel-button]:hidden"
                  id={`${listId}-search`}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search by railway, ID or station"
                  type="search"
                  value={searchInput}
                />
                {searchInput ? (
                  <button
                    aria-label="Clear search"
                    className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                    onClick={() => {
                      setSearchInput("");
                      setQuery("");
                    }}
                    type="button"
                  >
                    <X aria-hidden="true" className="size-4" />
                  </button>
                ) : null}
              </div>
              {railways.length >= 2 ? (
                <div>
                  <label className="sr-only" htmlFor={`${listId}-railway`}>
                    Railway
                  </label>
                  <Select id={`${listId}-railway`} onChange={(event) => setRailway(event.target.value)} value={railway}>
                    <SelectOption value="">All railways</SelectOption>
                    {railways.map((name) => (
                      <SelectOption key={name} value={name}>
                        {name}
                      </SelectOption>
                    ))}
                  </Select>
                </div>
              ) : null}
              <p aria-live="polite" className="text-sm text-slate-600">
                {countsText}
              </p>
            </div>
          ) : null}

          {run ? (
            <div className="order-4 border-b border-slate-200 p-4 lg:order-7 lg:border-b-0 lg:border-t">
              <RunStatusPanel onDismiss={dismissRun} pollError={pollError} run={run} />
            </div>
          ) : null}

          {shown.length > 0 ? (
            <div className={cn("order-5 flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-2", listHidden)}>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium text-slate-700">
                <input
                  aria-controls={`${listId}-list`}
                  checked={allShownSelected}
                  className="size-4 cursor-pointer accent-teal-700"
                  onChange={toggleAllShown}
                  ref={selectAllRef}
                  type="checkbox"
                />
                {shown.length === sections.length ? `Select all ${shown.length}` : `Select all ${shown.length} shown`}
              </label>
              <Button
                disabled={selectedCount === 0}
                onClick={() => setSelected(new Set())}
                size="sm"
                type="button"
                variant="ghost"
              >
                Clear
              </Button>
            </div>
          ) : null}

          <div className={cn("order-6 flex-1 p-2 lg:min-h-0 lg:overflow-y-auto", listHidden)}>
            {loading ? (
              <ul aria-busy="true" aria-label="Loading train sections" className="space-y-1 p-2">
                {Array.from({ length: 6 }, (_, index) => (
                  <li className="flex items-start gap-3 py-2.5" key={index}>
                    <span className="size-4 rounded bg-slate-200 motion-safe:animate-pulse" />
                    <span className="space-y-2">
                      <span className="block h-3.5 w-40 rounded bg-slate-200 motion-safe:animate-pulse" />
                      <span className="block h-3 w-28 rounded bg-slate-200 motion-safe:animate-pulse" />
                    </span>
                  </li>
                ))}
              </ul>
            ) : sections.length === 0 && !loadError ? (
              <IconEmptyState
                action={
                  canManageSections ? (
                    <Link className={buttonVariants({ variant: "outline" })} href="/manage-sections">
                      Go to Manage sections
                    </Link>
                  ) : null
                }
                className="m-3"
                description={
                  canManageSections
                    ? "Only approved sections can be run. Draft a section and send it for approval in Manage sections."
                    : "Your client super admin approves sections before they appear here."
                }
                icon={TrainFront}
                title="No approved sections yet"
              />
            ) : shown.length === 0 && sections.length > 0 ? (
              <IconEmptyState
                action={
                  <Button onClick={clearFilters} type="button" variant="outline">
                    Clear filters
                  </Button>
                }
                className="m-3"
                description="Try a different search or railway."
                icon={Search}
                title={query ? `No sections match "${searchInput.trim()}"` : "No sections match these filters"}
              />
            ) : (
              <ul aria-label="Runnable train sections" className="space-y-0.5" id={`${listId}-list`}>
                {shown.map((section) => {
                  const isSelected = selectedIds.has(section.id);
                  const route = routeLine(section);
                  const hovered = hoveredId === section.id;
                  return (
                    <li
                      className={cn(
                        "group flex items-stretch rounded-md border-l-4 transition-colors duration-150 focus-within:ring-2 focus-within:ring-inset focus-within:ring-teal-600",
                        isSelected ? "border-teal-600 bg-teal-50" : "border-transparent",
                        !isSelected && hovered && "bg-slate-50",
                        flashId === section.id && "motion-safe:bg-amber-50",
                      )}
                      id={`${listId}-row-${section.id}`}
                      key={section.id}
                      onMouseEnter={() => setHoveredId(section.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      <label className="flex min-h-14 flex-1 cursor-pointer items-start gap-3 px-3 py-2.5">
                        <input
                          checked={isSelected}
                          className="mt-0.5 size-4 shrink-0 cursor-pointer accent-teal-700 focus-visible:outline-none"
                          onBlur={() => setHoveredId(null)}
                          onChange={() => toggle(section.id)}
                          onFocus={() => setHoveredId(section.id)}
                          type="checkbox"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm">
                            <span className="font-medium text-slate-950">{section.railway_id || `Section #${section.id}`}</span>
                            {section.railway_name ? <span className="text-slate-600"> · {section.railway_name}</span> : null}
                          </span>
                          {route ? (
                            <span className="block text-xs text-slate-500">
                              {section.section_start_name} <span aria-hidden="true">→</span>
                              <span className="sr-only"> to </span> {section.section_end_name}
                            </span>
                          ) : null}
                          {showOrganization ? (
                            <span className="block text-xs text-slate-500">{section.organization_name}</span>
                          ) : null}
                          <span className="mt-1 block empty:hidden">
                            <RunHint section={section} />
                          </span>
                        </span>
                      </label>
                      <div className="flex items-start pr-2 pt-2">
                        <Button
                          aria-label={`Show ${section.railway_id || primaryLine(section)} on map`}
                          disabled={!section.section_polygon}
                          onClick={() => {
                            setFocusRequest((current) => ({ id: section.id, nonce: (current?.nonce ?? 0) + 1 }));
                            setMobileView("map");
                          }}
                          size="icon-sm"
                          title="Show on map"
                          type="button"
                          variant="ghost"
                        >
                          <Crosshair aria-hidden="true" />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Action bar: bottom of the left panel on desktop, fixed to the viewport on mobile. */}
          {!run && !loading && sections.length > 0 ? (
            <div className="fixed inset-x-0 bottom-0 z-30 order-8 border-t border-slate-200 bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgba(15,23,42,0.06)] backdrop-blur lg:static lg:z-auto lg:bg-white lg:p-4 lg:shadow-none lg:backdrop-blur-none">
              <ActionBarContent
                alreadyProcessingCount={alreadyProcessing.length}
                canProcess={canProcess}
                helperId={helperId}
                mixedOrganizations={mixedOrganizations}
                onClear={() => setSelected(new Set())}
                onProcess={() => {
                  setSubmitError("");
                  setConfirmOpen(true);
                }}
                processLabel={processLabel}
                selectedCount={selectedCount}
                submitting={submitting}
                tooMany={tooMany}
              />
            </div>
          ) : null}
        </div>

        <section
          className={cn(
            "relative h-[60dvh] min-h-[22rem] overflow-hidden rounded-lg border border-slate-200 bg-slate-900 shadow-sm lg:block lg:h-full lg:min-h-0",
            mobileView === "map" ? "block" : "hidden",
          )}
        >
          <SectionSelectionMap
            className="h-full w-full"
            focusRequest={focusRequest}
            hoveredId={hoveredId}
            onHover={setHoveredId}
            onToggle={toggleFromMap}
            sections={mapSections}
            selectedIds={selectedIds}
            visibleIds={shownIds}
          />
        </section>
      </div>

      <Dialog
        onOpenChange={(open) => {
          if (!submitting) {
            setConfirmOpen(open);
          }
        }}
        open={confirmOpen}
      >
        <DialogContent
          className="max-w-lg"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            startButtonRef.current?.focus();
          }}
        >
          <div className="space-y-2 text-left">
            <DialogTitle>
              Run {product.name} on {selectedCount} section{selectedCount === 1 ? "" : "s"}?
            </DialogTitle>
            <DialogDescription>
              {runPage.dialogBody(sceneSearch)}
              {user?.email ? ` We'll email you at ${user.email} when the run finishes.` : " We'll email you when the run finishes."}
            </DialogDescription>
          </div>

          {extension?.confirmSummary ? <div className="mt-4">{extension.confirmSummary}</div> : null}

          <ul
            aria-label="Sections in this run"
            className="mt-4 max-h-48 divide-y divide-slate-200 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 text-sm"
          >
            {selectedSections.map((section) => (
              <li className="flex items-center justify-between gap-3 px-3 py-2 text-slate-700" key={section.id}>
                <span className="min-w-0 truncate">{shortLabel(section)}</span>
                {section.active_run ? (
                  <span className="shrink-0 text-[11px] font-semibold text-amber-800">In run #{section.active_run.id}</span>
                ) : null}
              </li>
            ))}
          </ul>

          {alreadyProcessing.length > 0 || ranToday.length > 0 ? (
            <div className="mt-3 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
              <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <div className="space-y-1">
                {alreadyProcessing.length > 0 ? (
                  <p>
                    {alreadyProcessing.length === 1 ? "1 of these sections is" : `${alreadyProcessing.length} of these sections are`} already
                    being processed in {activeRunIds.map((id) => `Run #${id}`).join(", ")}. Running{" "}
                    {alreadyProcessing.length === 1 ? "it" : "them"} again starts a separate run.
                  </p>
                ) : null}
                {ranToday.length > 0 ? (
                  <p>
                    {ranToday.length === 1 ? "1 of these sections was" : `${ranToday.length} of these sections were`} already run today.{" "}
                    {runPage.ranTodayNote}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          <p className="mt-3 flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-900">
            <FlaskConical aria-hidden="true" className="size-4 shrink-0" />
            {runPage.syntheticLine}
          </p>

          {submitError ? (
            <Alert className="mt-3" role="alert" variant="destructive">
              {submitError}
            </Alert>
          ) : null}

          <DialogFooter>
            <Button disabled={submitting} onClick={() => setConfirmOpen(false)} type="button" variant="outline">
              Cancel
            </Button>
            <Button
              className={PRIMARY_BUTTON_CLASS}
              disabled={!canProcess}
              onClick={() => void startRun()}
              ref={startButtonRef}
              type="button"
            >
              {submitting ? (
                <Loader2 aria-hidden="true" className="motion-safe:animate-spin motion-reduce:animate-none" />
              ) : (
                <Play aria-hidden="true" />
              )}
              {submitting ? "Starting…" : "Start run"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

function ActionBarContent({
  alreadyProcessingCount,
  canProcess,
  helperId,
  mixedOrganizations,
  onClear,
  onProcess,
  processLabel,
  selectedCount,
  submitting,
  tooMany,
}: {
  alreadyProcessingCount: number;
  canProcess: boolean;
  helperId: string;
  mixedOrganizations: boolean;
  onClear: () => void;
  onProcess: () => void;
  processLabel: string;
  selectedCount: number;
  submitting: boolean;
  tooMany: boolean;
}) {
  let helper = "";
  let helperTone = "text-slate-500";
  if (selectedCount === 0) {
    helper = "Select at least one section to run the model.";
  } else if (mixedOrganizations) {
    helper = "All sections in a run must belong to the same client company.";
    helperTone = "text-red-700";
  } else if (tooMany) {
    helper = `A run can include at most ${MAX_SECTIONS_PER_RUN} sections.`;
    helperTone = "text-red-700";
  } else if (alreadyProcessingCount > 0) {
    helper = `${alreadyProcessingCount} selected section${alreadyProcessingCount === 1 ? " is" : "s are"} already being processed.`;
    helperTone = "text-amber-800";
  }

  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-950">
          {selectedCount} section{selectedCount === 1 ? "" : "s"} selected
        </p>
        {helper ? (
          <p className={cn("text-xs", helperTone)} id={helperId}>
            {helper}
          </p>
        ) : null}
      </div>
      <Button className="hidden sm:inline-flex" disabled={selectedCount === 0} onClick={onClear} type="button" variant="outline">
        Clear
      </Button>
      <Button
        aria-describedby={helper ? helperId : undefined}
        className={PRIMARY_BUTTON_CLASS}
        disabled={!canProcess}
        onClick={onProcess}
        type="button"
      >
        {submitting ? (
          <Loader2 aria-hidden="true" className="motion-safe:animate-spin motion-reduce:animate-none" />
        ) : (
          <Play aria-hidden="true" />
        )}
        {processLabel}
      </Button>
    </div>
  );
}
