"use client";

export function ConfirmDeleteDialog({
  label,
  loading,
  onClose,
  onConfirm,
  open,
}: {
  label: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
  open: boolean;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 px-4">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-950">Delete {label}?</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          This action cannot be undone. The item will be permanently removed.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            className="min-h-10 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            disabled={loading}
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="min-h-10 rounded-md bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
            disabled={loading}
            onClick={onConfirm}
            type="button"
          >
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
