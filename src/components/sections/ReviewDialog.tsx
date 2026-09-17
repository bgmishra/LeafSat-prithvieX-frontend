"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type ReviewAction = "approve" | "reject";

/**
 * Where the client super admin records why they signed a batch of sections off
 * or sent it back. A rejection has to say why; an approval remark is optional.
 */
export function ReviewDialog({
  action,
  count,
  loading,
  onClose,
  onConfirm,
  open,
}: {
  action: ReviewAction;
  count: number;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (note: string) => void;
  open: boolean;
}) {
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  if (!open) {
    return null;
  }

  const isRejection = action === "reject";
  const sections = `${count} section${count === 1 ? "" : "s"}`;

  function close() {
    setNote("");
    setError("");
    onClose();
  }

  function confirm() {
    const trimmed = note.trim();

    if (isRejection && !trimmed) {
      setError("Tell the engineer what needs changing before sending it back.");
      return;
    }

    setNote("");
    setError("");
    onConfirm(trimmed);
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 px-4">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-950">
          {isRejection ? `Send ${sections} back?` : `Approve ${sections}?`}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {isRejection
            ? "Your remark goes back to whoever drafted the section, so they know what to fix."
            : "Approved sections are locked and become visible to your field supervisors. You can leave a remark for the record."}
        </p>

        <div className="mt-5">
          <Label htmlFor="review-note">
            {isRejection ? "Reason for sending back" : "Remark (optional)"}
          </Label>
          <Textarea
            autoFocus
            className="mt-2"
            id="review-note"
            onChange={(event) => setNote(event.target.value)}
            placeholder={
              isRejection
                ? "e.g. The boundary overshoots the depot at the eastern end."
                : "e.g. Checked against the 2026 track survey."
            }
            rows={4}
            value={note}
          />
          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button disabled={loading} onClick={close} variant="outline">
            Cancel
          </Button>
          <Button disabled={loading} onClick={confirm}>
            {loading ? "Working..." : isRejection ? "Send back" : "Approve"}
          </Button>
        </div>
      </div>
    </div>
  );
}
