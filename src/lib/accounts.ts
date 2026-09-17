"use client";

import { apiRequest } from "@/api/client";

export type OrganizationRole = "client_super_admin" | "engineer" | "field_supervisor";

export type InvitationKind = "organization" | "member";

export type InvitationStatus = "pending" | "accepted" | "revoked";

export const ROLE_LABELS: Record<OrganizationRole, string> = {
  client_super_admin: "Client Super Admin",
  engineer: "Engineer",
  field_supervisor: "Field Supervisor",
};

/** Roles a client super admin is allowed to hand out inside their own company. */
export const ASSIGNABLE_ROLES: OrganizationRole[] = ["engineer", "field_supervisor"];

export type SessionUser = {
  id: number;
  full_name: string;
  affiliation: string | null;
  email: string;
  phone_number: string;
  phone_extension: string;
  mobile_number: string;
  user_type: "normal" | "admin" | "staff" | "client";
  organization: string | null;
  role: OrganizationRole | null;
  date_joined: string;
};

export type Organization = {
  id: number;
  company_name: string;
  slug: string;
  is_active: boolean;
  member_count: number;
  created_at: string;
};

export type OrganizationMember = {
  id: number;
  membership_id: number;
  full_name: string;
  email: string;
  phone_number: string;
  phone_extension: string;
  mobile_number: string;
  role: OrganizationRole;
  role_label: string;
  is_active: boolean;
  account_is_active: boolean;
  organization_name: string;
  created_at: string;
};

export type Invitation = {
  id: string;
  email: string;
  kind: InvitationKind;
  kind_label: string;
  role: OrganizationRole;
  role_label: string;
  status: InvitationStatus;
  status_label: string;
  company_name: string;
  full_name: string;
  organization_name: string | null;
  invited_by_email: string | null;
  expires_at: string;
  is_expired: boolean;
  accepted_at: string | null;
  created_at: string;
};

/** What the invitation landing page needs to know before rendering a form. */
export type InvitationPreview = {
  email: string;
  kind: InvitationKind;
  role: OrganizationRole;
  role_label: string;
  company_name: string;
  full_name: string;
  organization_name: string | null;
  expires_at: string;
};

export type AcceptInvitationResponse = {
  message: string;
  access: string;
  refresh: string;
  user: {
    id: number;
    full_name: string;
    email: string;
    user_type: string;
    organization: string;
    organization_id: number;
    role: OrganizationRole;
  };
};

export type AcceptOrganizationInvitationPayload = {
  company_name: string;
  full_name?: string;
  phone_number?: string;
  phone_extension?: string;
  mobile_number: string;
  password: string;
  confirm_password: string;
};

export type AcceptMemberInvitationPayload = {
  phone_number?: string;
  phone_extension?: string;
  mobile_number?: string;
  password: string;
  confirm_password: string;
};

/** Django REST list endpoints here are unpaginated, but stay tolerant either way. */
function toArray<T>(payload: T[] | { results?: T[] } | null): T[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  return payload?.results ?? [];
}

// -- the invitation link itself (public, no token needed) --------------------

export function getInvitationPreview(token: string) {
  return apiRequest<InvitationPreview>(
    `/api/auth/invitations/${encodeURIComponent(token)}/`,
  );
}

export function acceptInvitation(
  token: string,
  payload: AcceptOrganizationInvitationPayload | AcceptMemberInvitationPayload,
) {
  return apiRequest<AcceptInvitationResponse>(
    `/api/auth/invitations/${encodeURIComponent(token)}/accept/`,
    { method: "POST", body: JSON.stringify(payload) },
  );
}

// -- system admin: onboarding client companies -------------------------------

export async function listClientInvitations() {
  const payload = await apiRequest<Invitation[] | { results?: Invitation[] }>(
    "/api/auth/system/invitations/?kind=organization",
    { auth: true },
  );
  return toArray(payload);
}

export function inviteClientCompany(payload: { email: string; company_name?: string }) {
  return apiRequest<{ message: string; invitation: Invitation }>(
    "/api/auth/system/invitations/",
    { auth: true, method: "POST", body: JSON.stringify(payload) },
  );
}

export function resendClientInvitation(invitationId: string) {
  return apiRequest<{ message: string; invitation: Invitation }>(
    `/api/auth/system/invitations/${invitationId}/`,
    { auth: true, method: "POST" },
  );
}

export function revokeClientInvitation(invitationId: string) {
  return apiRequest<{ message: string }>(`/api/auth/system/invitations/${invitationId}/`, {
    auth: true,
    method: "DELETE",
  });
}

export async function listOrganizations() {
  const payload = await apiRequest<Organization[] | { results?: Organization[] }>(
    "/api/auth/system/organizations/",
    { auth: true },
  );
  return toArray(payload);
}

export function setOrganizationActive(organizationId: number, isActive: boolean) {
  return apiRequest<Organization>(`/api/auth/system/organizations/${organizationId}/`, {
    auth: true,
    method: "PATCH",
    body: JSON.stringify({ is_active: isActive }),
  });
}

// -- client super admin: managing their own team -----------------------------

export async function listOrganizationMembers() {
  const payload = await apiRequest<OrganizationMember[] | { results?: OrganizationMember[] }>(
    "/api/auth/organization/members/",
    { auth: true },
  );
  return toArray(payload);
}

export function inviteOrganizationMember(payload: {
  email: string;
  full_name: string;
  role: OrganizationRole;
}) {
  return apiRequest<{ message: string; invitation: Invitation }>(
    "/api/auth/organization/members/",
    { auth: true, method: "POST", body: JSON.stringify(payload) },
  );
}

export function updateOrganizationMember(
  membershipId: number,
  changes: { is_active?: boolean; role?: OrganizationRole },
) {
  return apiRequest<OrganizationMember>(
    `/api/auth/organization/members/${membershipId}/`,
    { auth: true, method: "PATCH", body: JSON.stringify(changes) },
  );
}

export function removeOrganizationMember(membershipId: number) {
  return apiRequest<{ message: string }>(
    `/api/auth/organization/members/${membershipId}/`,
    { auth: true, method: "DELETE" },
  );
}

export async function listTeamInvitations() {
  const payload = await apiRequest<Invitation[] | { results?: Invitation[] }>(
    "/api/auth/organization/invitations/",
    { auth: true },
  );
  return toArray(payload);
}

export function resendTeamInvitation(invitationId: string) {
  return apiRequest<{ message: string; invitation: Invitation }>(
    `/api/auth/organization/invitations/${invitationId}/`,
    { auth: true, method: "POST" },
  );
}

export function revokeTeamInvitation(invitationId: string) {
  return apiRequest<{ message: string }>(
    `/api/auth/organization/invitations/${invitationId}/`,
    { auth: true, method: "DELETE" },
  );
}

// -- who am I ----------------------------------------------------------------

export function getSession() {
  return apiRequest<SessionUser>("/api/auth/profile/", { auth: true });
}
