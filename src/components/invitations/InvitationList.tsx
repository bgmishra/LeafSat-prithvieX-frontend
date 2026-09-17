"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Invitation } from "@/lib/accounts";

function statusClasses(invitation: Invitation) {
  if (invitation.status === "accepted") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }
  if (invitation.status === "revoked") {
    return "bg-slate-100 text-slate-600 ring-slate-200";
  }
  if (invitation.is_expired) {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }
  return "bg-teal-50 text-teal-700 ring-teal-200";
}

function statusLabel(invitation: Invitation) {
  if (invitation.status === "pending" && invitation.is_expired) {
    return "Expired";
  }
  return invitation.status_label;
}

export function InvitationList({
  busyId,
  emptyMessage,
  invitations,
  onResend,
  onRevoke,
  showRole = false,
}: {
  busyId: string | null;
  emptyMessage: string;
  invitations: Invitation[];
  onResend: (invitation: Invitation) => void;
  onRevoke: (invitation: Invitation) => void;
  showRole?: boolean;
}) {
  if (invitations.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-500">{emptyMessage}</p>;
  }

  return (
    <ul className="divide-y divide-slate-100">
      {invitations.map((invitation) => {
        const pending = invitation.status === "pending";
        const busy = busyId === invitation.id;

        return (
          <li
            className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
            key={invitation.id}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950">{invitation.email}</p>
              <p className="mt-1 text-sm text-slate-500">
                {invitation.organization_name || "New company"}
                {showRole ? ` · ${invitation.role_label}` : ""}
                {pending
                  ? ` · expires ${new Date(invitation.expires_at).toLocaleDateString()}`
                  : ""}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Badge className={statusClasses(invitation)}>{statusLabel(invitation)}</Badge>
              {pending ? (
                <>
                  <Button
                    disabled={busy}
                    onClick={() => onResend(invitation)}
                    size="sm"
                    variant="outline"
                  >
                    Resend
                  </Button>
                  <Button
                    disabled={busy}
                    onClick={() => onRevoke(invitation)}
                    size="sm"
                    variant="outline"
                  >
                    Revoke
                  </Button>
                </>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
