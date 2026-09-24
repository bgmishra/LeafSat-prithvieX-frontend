"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Loader2, Search, Share2, UserX, X } from "lucide-react";
import { getErrorMessage } from "@/api/client";
import { useToast } from "@/admin/components/ToastProvider";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatRelative, pluralize } from "@/lib/format";
import {
  listResultShares,
  listShareRecipients,
  shareResult,
  unshareResult,
  type ResultShare,
  type ShareRecipient,
} from "@/lib/model-runs";
import { cn } from "@/lib/utils";
import { useModelProduct } from "./model-product";
import { PRIMARY_BUTTON_CLASS } from "./RunStatusPanel";

const NOTE_LIMIT = 1000;

/** Show a search box once the list is long enough to need one. */
const SEARCH_THRESHOLD = 6;

function initials(name: string) {
  const words = name.split(/[\s._@-]+/).filter(Boolean);
  const letters = words.length > 1 ? `${words[0][0]}${words[words.length - 1][0]}` : (words[0] ?? "?").slice(0, 2);
  return letters.toUpperCase();
}

/**
 * "Share" on the single-section map: hand this result to field supervisors.
 *
 * The result then appears on their Shared Model Results page and they get a
 * notification and an email. Ticking someone who already has it sends it again
 * with the new note and marks it new for them.
 */
export function ShareResultDialog({
  runId,
  resultId,
  sectionName,
  disabled,
}: {
  runId: number;
  resultId: number;
  sectionName: string;
  /** Unfinished or failed results have nothing worth sharing yet. */
  disabled?: boolean;
}) {
  const { notify } = useToast();
  const { mapNoun } = useModelProduct();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [recipients, setRecipients] = useState<ShareRecipient[]>([]);
  const [shares, setShares] = useState<ResultShare[]>([]);
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [note, setNote] = useState("");
  const [query, setQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [removingId, setRemovingId] = useState<number | null>(null);

  // Who already has it, so the button can show a count before it is opened.
  useEffect(() => {
    let active = true;
    listResultShares(runId, resultId)
      .then((existing) => {
        if (active) {
          setShares(existing);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [resultId, runId]);

  useEffect(() => {
    if (!open) {
      return;
    }
    let active = true;
    queueMicrotask(() => {
      if (!active) {
        return;
      }
      setLoading(true);
      setLoadError("");
      Promise.all([listShareRecipients(), listResultShares(runId, resultId)])
        .then(([people, existing]) => {
          if (active) {
            setRecipients(people);
            setShares(existing);
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
    });
    return () => {
      active = false;
    };
  }, [open, resultId, runId]);

  const shareByRecipient = useMemo(() => new Map(shares.map((share) => [share.recipient, share])), [shares]);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle
      ? recipients.filter((person) => `${person.full_name} ${person.email}`.toLowerCase().includes(needle))
      : recipients;
  }, [query, recipients]);

  const reset = () => {
    setSelected(new Set());
    setNote("");
    setQuery("");
    setSubmitError("");
  };

  const toggle = (id: number) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

  const submit = async () => {
    setSubmitting(true);
    setSubmitError("");
    try {
      const updated = await shareResult(runId, resultId, [...selected], note.trim());
      setShares(updated);
      notify({ title: `Shared with ${pluralize(selected.size, "field supervisor")}.`, type: "success" });
      reset();
      setOpen(false);
    } catch (caught) {
      setSubmitError(getErrorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (share: ResultShare) => {
    setRemovingId(share.id);
    setSubmitError("");
    try {
      await unshareResult(runId, resultId, share.id);
      setShares((current) => current.filter((item) => item.id !== share.id));
      notify({ title: `Removed from ${share.recipient_name || share.recipient_email}'s shared results.`, type: "success" });
    } catch (caught) {
      setSubmitError(getErrorMessage(caught));
    } finally {
      setRemovingId(null);
    }
  };

  const resending = [...selected].filter((id) => shareByRecipient.has(id)).length;

  return (
    <>
      <Button
        disabled={disabled}
        onClick={() => setOpen(true)}
        size="sm"
        title={disabled ? "Only finished, successful results can be shared" : undefined}
        type="button"
        variant="outline"
      >
        <Share2 aria-hidden="true" />
        Share
        {shares.length > 0 ? (
          <span className="rounded-full bg-teal-50 px-1.5 text-[11px] font-semibold tabular-nums text-teal-800">
            {shares.length}
          </span>
        ) : null}
      </Button>

      <Dialog
        onOpenChange={(next) => {
          if (!submitting) {
            setOpen(next);
            if (!next) {
              reset();
            }
          }
        }}
        open={open}
      >
        <DialogContent className="max-w-lg">
          <div className="space-y-1.5 text-left">
            <DialogTitle>Share with field supervisors</DialogTitle>
            <DialogDescription>
              Send the {mapNoun} for <span className="font-medium text-slate-800">{sectionName}</span> (run #{runId}).
              It appears on their Shared Model Results page, and they get a notification and an email.
            </DialogDescription>
          </div>

          {loading ? (
            <p aria-busy="true" className="mt-4 flex items-center gap-2 py-6 text-sm text-slate-500">
              <Loader2 aria-hidden="true" className="size-4 motion-safe:animate-spin" />
              Loading field supervisors…
            </p>
          ) : loadError ? (
            <Alert className="mt-4" role="alert" variant="destructive">
              We couldn&apos;t load field supervisors. {loadError}
            </Alert>
          ) : recipients.length === 0 ? (
            <div className="mt-4 flex gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
              <UserX aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-slate-400" />
              <p>
                Your company has no active field supervisors yet.{" "}
                <Link className="font-medium text-teal-700 underline-offset-4 hover:underline" href="/team">
                  Invite one from Team
                </Link>
                .
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {recipients.length > SEARCH_THRESHOLD ? (
                <div className="relative">
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                  />
                  <Input
                    aria-label="Search field supervisors"
                    className="pl-9"
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search by name or email"
                    value={query}
                  />
                </div>
              ) : null}

              <fieldset>
                <legend className="sr-only">Field supervisors</legend>
                <ul className="max-h-64 divide-y divide-slate-200 overflow-y-auto rounded-lg border border-slate-200">
                  {visible.map((person) => {
                    const share = shareByRecipient.get(person.id);
                    const checked = selected.has(person.id);
                    const name = person.full_name || person.email;
                    return (
                      <li className={cn("flex items-center gap-3 px-3 py-2.5", checked && "bg-teal-50/60")} key={person.id}>
                        <input
                          aria-describedby={share ? `share-status-${person.id}` : undefined}
                          checked={checked}
                          className="size-4 shrink-0 rounded border-slate-300 accent-teal-700"
                          id={`share-recipient-${person.id}`}
                          onChange={() => toggle(person.id)}
                          type="checkbox"
                        />
                        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3" htmlFor={`share-recipient-${person.id}`}>
                          <span
                            aria-hidden="true"
                            className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600"
                          >
                            {initials(name)}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-slate-900">{name}</span>
                            {share ? (
                              <span className="block truncate text-xs text-slate-500" id={`share-status-${person.id}`}>
                                Shared {formatRelative(share.shared_at)} ·{" "}
                                {share.viewed_at ? (
                                  <span className="inline-flex items-center gap-0.5 text-emerald-700">
                                    <Check aria-hidden="true" className="size-3" /> Viewed
                                  </span>
                                ) : (
                                  "Not opened yet"
                                )}
                              </span>
                            ) : (
                              <span className="block truncate text-xs text-slate-500">{person.email}</span>
                            )}
                          </span>
                        </label>
                        {share ? (
                          <Button
                            aria-label={`Stop sharing with ${name}`}
                            disabled={removingId === share.id}
                            onClick={() => void remove(share)}
                            size="icon-sm"
                            title="Stop sharing"
                            type="button"
                            variant="ghost"
                          >
                            {removingId === share.id ? (
                              <Loader2 aria-hidden="true" className="motion-safe:animate-spin" />
                            ) : (
                              <X aria-hidden="true" />
                            )}
                          </Button>
                        ) : null}
                      </li>
                    );
                  })}
                  {visible.length === 0 ? (
                    <li className="px-3 py-6 text-center text-sm text-slate-500">No field supervisors match “{query}”.</li>
                  ) : null}
                </ul>
              </fieldset>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-800" htmlFor="share-note">
                  Note <span className="font-normal text-slate-500">(optional)</span>
                </label>
                <Textarea
                  id="share-note"
                  maxLength={NOTE_LIMIT}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="e.g. Please check the red stretch north of the junction before Friday."
                  rows={3}
                  value={note}
                />
                <p className="text-right text-[11px] tabular-nums text-slate-400">
                  {note.length}/{NOTE_LIMIT}
                </p>
              </div>

              {resending > 0 ? (
                <p className="text-xs text-slate-500">
                  {pluralize(resending, "person", "people")} already {resending === 1 ? "has" : "have"} this result. Sending
                  again updates the note and marks it new for them.
                </p>
              ) : null}
            </div>
          )}

          {submitError ? (
            <Alert className="mt-3" role="alert" variant="destructive">
              {submitError}
            </Alert>
          ) : null}

          <DialogFooter>
            <Button disabled={submitting} onClick={() => setOpen(false)} type="button" variant="outline">
              Cancel
            </Button>
            <Button
              className={PRIMARY_BUTTON_CLASS}
              disabled={submitting || selected.size === 0}
              onClick={() => void submit()}
              type="button"
            >
              {submitting ? (
                <Loader2 aria-hidden="true" className="motion-safe:animate-spin motion-reduce:animate-none" />
              ) : (
                <Share2 aria-hidden="true" />
              )}
              {submitting
                ? "Sharing…"
                : selected.size === 0
                  ? "Share"
                  : `Share with ${pluralize(selected.size, "person", "people")}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
