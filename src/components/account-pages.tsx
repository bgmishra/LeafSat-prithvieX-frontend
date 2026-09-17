"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { apiRequest, getErrorMessage } from "@/api/client";
import { Button } from "@/components/ui/button";
import {
  ErrorMessage,
  LoadingState,
  Panel,
  SubmitButton,
  SuccessMessage,
  TextField,
} from "./ui";

type Profile = {
  name?: string;
  full_name?: string;
  affiliation?: string | null;
  email?: string;
};

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
