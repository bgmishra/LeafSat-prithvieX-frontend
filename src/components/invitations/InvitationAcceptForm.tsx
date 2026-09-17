"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { getErrorMessage } from "@/api/client";
import {
  acceptInvitation,
  getInvitationPreview,
  type InvitationPreview,
} from "@/lib/accounts";
import { useAuth } from "@/store/auth-provider";
import { ErrorMessage, SubmitButton, TextField } from "@/components/ui";

function InvitationFrame({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <Link className="inline-flex items-center" href="/login">
          <Image
            alt="LeafSat"
            className="h-[110px] w-auto object-contain"
            height={110}
            src="/images/logo.png"
            width={110}
          />
        </Link>
        <h1 className="mt-6 text-2xl font-semibold text-slate-950">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        <div className="mt-6">{children}</div>
      </section>
    </main>
  );
}

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-2 last:border-b-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-950">{value}</span>
    </div>
  );
}

export function InvitationAcceptForm({ token }: { token: string }) {
  const router = useRouter();
  const { login } = useAuth();

  const [invitation, setInvitation] = useState<InvitationPreview | null>(null);
  const [linkError, setLinkError] = useState("");
  const [checking, setChecking] = useState(true);

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const passwordMismatch = passwordConfirm.length > 0 && password !== passwordConfirm;

  useEffect(() => {
    let active = true;

    getInvitationPreview(token)
      .then((data) => {
        if (active) {
          setInvitation(data);
        }
      })
      .catch((caught) => {
        if (active) {
          setLinkError(getErrorMessage(caught));
        }
      })
      .finally(() => {
        if (active) {
          setChecking(false);
        }
      });

    return () => {
      active = false;
    };
  }, [token]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!invitation) {
      return;
    }

    if (password !== passwordConfirm) {
      setError("Password and confirm password must match exactly.");
      return;
    }

    setError("");
    setSubmitting(true);

    const form = new FormData(event.currentTarget);
    const isCompanySetup = invitation.kind === "organization";

    const payload = isCompanySetup
      ? {
          company_name: String(form.get("company_name") || ""),
          full_name: String(form.get("full_name") || ""),
          phone_number: String(form.get("phone_number") || ""),
          phone_extension: String(form.get("phone_extension") || ""),
          mobile_number: String(form.get("mobile_number") || ""),
          password,
          confirm_password: passwordConfirm,
        }
      : {
          phone_number: String(form.get("phone_number") || ""),
          phone_extension: String(form.get("phone_extension") || ""),
          mobile_number: String(form.get("mobile_number") || ""),
          password,
          confirm_password: passwordConfirm,
        };

    try {
      const data = await acceptInvitation(token, payload);
      login({ access: data.access, refresh: data.refresh });
      router.replace("/");
    } catch (caught) {
      setError(getErrorMessage(caught));
      setSubmitting(false);
    }
  }

  if (checking) {
    return (
      <InvitationFrame title="Checking your invitation" description="One moment while we verify this link.">
        <p className="text-sm text-slate-500">Loading...</p>
      </InvitationFrame>
    );
  }

  if (!invitation) {
    return (
      <InvitationFrame
        title="This invitation cannot be used"
        description="Invitation links are single-use and expire after a short time."
      >
        <ErrorMessage message={linkError} />
        <p className="mt-4 text-sm text-slate-600">
          Ask the person who invited you to send a new link, then open it from your email.
        </p>
        <Link
          className="mt-6 inline-block text-sm font-medium text-teal-700 hover:text-teal-800"
          href="/login"
        >
          Back to sign in
        </Link>
      </InvitationFrame>
    );
  }

  const isCompanySetup = invitation.kind === "organization";

  return (
    <InvitationFrame
      title={isCompanySetup ? "Set up your company on LeafSat" : "Activate your LeafSat account"}
      description={
        isCompanySetup
          ? "Complete your company details to create your client super admin account. You can invite your engineers and field supervisors straight afterwards."
          : "Choose a password to activate your account. Your company and role have already been set by your administrator."
      }
    >
      <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-2">
        <ReadOnlyRow label="Email" value={invitation.email} />
        {!isCompanySetup ? (
          <>
            <ReadOnlyRow label="Company" value={invitation.organization_name || "-"} />
            <ReadOnlyRow label="Role" value={invitation.role_label} />
            {invitation.full_name ? (
              <ReadOnlyRow label="Name" value={invitation.full_name} />
            ) : null}
          </>
        ) : null}
      </div>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <ErrorMessage message={error} />

        {isCompanySetup ? (
          <>
            <TextField
              defaultValue={invitation.company_name}
              label="Company name"
              name="company_name"
              placeholder="Your company's registered name"
              required
            />
            <TextField
              label="Contact name (optional)"
              name="full_name"
              placeholder="Who manages this account"
            />
          </>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
          <TextField
            label="Phone number (optional)"
            name="phone_number"
            placeholder="+44 20 7946 0000"
            type="tel"
          />
          <TextField label="Extension" name="phone_extension" placeholder="204" />
        </div>

        <TextField
          label={isCompanySetup ? "Mobile number" : "Mobile number (optional)"}
          name="mobile_number"
          placeholder="+44 7700 900123"
          required={isCompanySetup}
          type="tel"
        />

        <TextField
          label="Password"
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Create a password"
          required
          type="password"
          value={password}
        />
        <TextField
          label="Confirm password"
          name="confirm_password"
          onChange={(event) => setPasswordConfirm(event.target.value)}
          placeholder="Re-enter your password"
          required
          type="password"
          value={passwordConfirm}
        />
        {passwordMismatch ? (
          <p className="text-sm text-red-600">Password and confirm password must match exactly.</p>
        ) : null}

        <SubmitButton loading={submitting}>
          {isCompanySetup ? "Create company account" : "Activate account"}
        </SubmitButton>
      </form>
    </InvitationFrame>
  );
}
