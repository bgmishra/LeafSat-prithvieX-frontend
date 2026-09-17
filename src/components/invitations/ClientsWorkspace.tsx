"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { getErrorMessage } from "@/api/client";
import { Button } from "@/components/ui/button";
import {
  ErrorMessage,
  Panel,
  SubmitButton,
  SuccessMessage,
  TextField,
} from "@/components/ui";
import {
  inviteClientCompany,
  listClientInvitations,
  listOrganizations,
  resendClientInvitation,
  revokeClientInvitation,
  setOrganizationActive,
  type Invitation,
  type Organization,
} from "@/lib/accounts";
import { InvitationList } from "./InvitationList";

export function ClientsWorkspace() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [inviting, setInviting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError("");
    try {
      const [nextOrganizations, nextInvitations] = await Promise.all([
        listOrganizations(),
        listClientInvitations(),
      ]);
      setOrganizations(nextOrganizations);
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
      const data = await inviteClientCompany({
        email: String(form.get("email") || ""),
        company_name: String(form.get("company_name") || ""),
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

  async function toggleOrganization(organization: Organization) {
    setError("");
    setSuccess("");

    try {
      await setOrganizationActive(organization.id, !organization.is_active);
      setSuccess(
        `${organization.company_name} is now ${organization.is_active ? "suspended" : "active"}.`,
      );
      await refresh();
    } catch (caught) {
      setError(getErrorMessage(caught));
    }
  }

  return (
    <div className="grid gap-6">
      <Panel>
        <h2 className="text-lg font-semibold text-slate-950">Invite a client to LeafSat</h2>
        <p className="mt-1 text-sm text-slate-600">
          We email a single-use link. The recipient fills in their company details and becomes that
          company&apos;s client super admin, who can then add their own engineers and field
          supervisors.
        </p>

        <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={handleInvite}>
          <TextField
            label="Email"
            name="email"
            placeholder="operations@railcompany.com"
            required
            type="email"
          />
          <TextField
            label="Company name (optional)"
            name="company_name"
            placeholder="Pre-fill their company name"
          />
          <div className="sm:col-span-2">
            <SubmitButton loading={inviting}>Send invitation</SubmitButton>
          </div>
        </form>

        <div className="mt-4 grid gap-3">
          <ErrorMessage message={error} />
          <SuccessMessage message={success} />
        </div>
      </Panel>

      <Panel>
        <h2 className="text-lg font-semibold text-slate-950">Client companies</h2>
        {loading ? (
          <p className="py-6 text-center text-sm text-slate-500">Loading clients...</p>
        ) : organizations.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            No client has completed registration yet.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-100">
            {organizations.map((organization) => (
              <li
                className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                key={organization.id}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950">
                    {organization.company_name}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {organization.member_count} member
                    {organization.member_count === 1 ? "" : "s"} · joined{" "}
                    {new Date(organization.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  onClick={() => toggleOrganization(organization)}
                  size="sm"
                  variant="outline"
                >
                  {organization.is_active ? "Suspend access" : "Restore access"}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel>
        <h2 className="text-lg font-semibold text-slate-950">Client invitations</h2>
        {loading ? (
          <p className="py-6 text-center text-sm text-slate-500">Loading invitations...</p>
        ) : (
          <InvitationList
            busyId={busyId}
            emptyMessage="No client invitations have been sent yet."
            invitations={invitations}
            onResend={(invitation) => runInvitationAction(invitation, resendClientInvitation)}
            onRevoke={(invitation) => runInvitationAction(invitation, revokeClientInvitation)}
          />
        )}
      </Panel>
    </div>
  );
}
