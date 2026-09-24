"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { getErrorMessage } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  ErrorMessage,
  Panel,
  SubmitButton,
  SuccessMessage,
  TextField,
} from "@/components/ui";
import {
  ASSIGNABLE_ROLES,
  ROLE_LABELS,
  inviteOrganizationMember,
  listOrganizationMembers,
  listTeamInvitations,
  removeOrganizationMember,
  resendTeamInvitation,
  revokeTeamInvitation,
  updateOrganizationMember,
  type Invitation,
  type OrganizationMember,
  type OrganizationRole,
} from "@/lib/accounts";
import { InvitationList } from "./InvitationList";

export function TeamWorkspace() {
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [inviting, setInviting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError("");
    try {
      const [nextMembers, nextInvitations] = await Promise.all([
        listOrganizationMembers(),
        listTeamInvitations(),
      ]);
      setMembers(nextMembers);
      setInvitations(nextInvitations);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Deferred so the first render settles before refresh() touches state.
    queueMicrotask(() => {
      void refresh();
    });
  }, [refresh]);

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setInviting(true);

    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    try {
      const data = await inviteOrganizationMember({
        email: String(form.get("email") || ""),
        full_name: String(form.get("full_name") || ""),
        role: String(form.get("role") || "engineer") as OrganizationRole,
      });
      setSuccess(data.message);
      formElement.reset();
      await refresh();
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setInviting(false);
    }
  }

  async function runInvitationAction(
    invitation: Invitation,
    action: (id: string) => Promise<{ message: string }>,
  ) {
    setError("");
    setSuccess("");
    setBusyId(invitation.id);

    try {
      const data = await action(invitation.id);
      setSuccess(data.message);
      await refresh();
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setBusyId(null);
    }
  }

  async function toggleMember(member: OrganizationMember) {
    setError("");
    setSuccess("");

    try {
      await updateOrganizationMember(member.membership_id, { is_active: !member.is_active });
      setSuccess(
        `${member.full_name} is now ${member.is_active ? "deactivated" : "active"}.`,
      );
      await refresh();
    } catch (caught) {
      setError(getErrorMessage(caught));
    }
  }

  async function removeMember(member: OrganizationMember) {
    if (!window.confirm(`Remove ${member.full_name} from your company? This cannot be undone.`)) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      await removeOrganizationMember(member.membership_id);
      setSuccess(`${member.full_name} was removed.`);
      await refresh();
    } catch (caught) {
      setError(getErrorMessage(caught));
    }
  }

  return (
    <div className="grid gap-6">
      <Panel>
        <h2 className="text-lg font-semibold text-slate-950">Add a team member</h2>
        <p className="mt-1 text-sm text-slate-600">
          We email a single-use link. Your colleague only has to set a password — their company and
          role are already fixed by this invitation.
        </p>

        <form className="mt-5 grid gap-4 sm:grid-cols-3" onSubmit={handleInvite}>
          <TextField label="Full name" name="full_name" placeholder="Jordan Smith" required />
          <TextField
            label="Email"
            name="email"
            placeholder="jordan@company.com"
            required
            type="email"
          />
          <div>
            <Label htmlFor="role">Role</Label>
            <select
              className="mt-2 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              defaultValue="engineer"
              id="role"
              name="role"
            >
              {ASSIGNABLE_ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-3">
            <SubmitButton loading={inviting}>Send invitation</SubmitButton>
          </div>
        </form>

        <div className="mt-4 grid gap-3">
          <ErrorMessage message={error} />
          <SuccessMessage message={success} />
        </div>
      </Panel>

      <Panel>
        <h2 className="text-lg font-semibold text-slate-950">Team</h2>
        {loading ? (
          <p className="py-6 text-center text-sm text-slate-500">Loading team...</p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-100">
            {members.map((member) => {
              const isOwner = member.role === "client_super_admin";

              return (
                <li
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                  key={member.membership_id}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950">
                      {member.full_name}
                    </p>
                    <p className="mt-1 truncate text-sm text-slate-500">
                      {member.email}
                      {member.mobile_number ? ` · ${member.mobile_number}` : ""}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Badge
                      className={
                        member.is_active
                          ? "bg-teal-50 text-teal-700 ring-teal-200"
                          : "bg-slate-100 text-slate-600 ring-slate-200"
                      }
                    >
                      {member.role_label}
                    </Badge>
                    {isOwner ? null : (
                      <>
                        <Button onClick={() => toggleMember(member)} size="sm" variant="outline">
                          {member.is_active ? "Deactivate" : "Activate"}
                        </Button>
                        <Button onClick={() => removeMember(member)} size="sm" variant="outline">
                          Remove
                        </Button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Panel>
        <h2 className="text-lg font-semibold text-slate-950">Pending invitations</h2>
        {loading ? (
          <p className="py-6 text-center text-sm text-slate-500">Loading invitations...</p>
        ) : (
          <InvitationList
            busyId={busyId}
            emptyMessage="No pending invitations. People who have set their password appear under team members."
            invitations={invitations}
            onResend={(invitation) => runInvitationAction(invitation, resendTeamInvitation)}
            onRevoke={(invitation) => runInvitationAction(invitation, revokeTeamInvitation)}
            showRole
          />
        )}
      </Panel>
    </div>
  );
}
