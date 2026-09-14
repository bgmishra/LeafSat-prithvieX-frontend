"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { apiRequest, getErrorMessage } from "@/api/client";
import { useAuth } from "@/store/auth-provider";
import { ErrorMessage, SuccessMessage, SubmitButton, TextField } from "./ui";

type TokenResponse = {
  access?: string;
  refresh?: string;
  access_token?: string;
  refresh_token?: string;
};

function normalizeTokens(data: TokenResponse) {
  return {
    access: data.access || data.access_token,
    refresh: data.refresh || data.refresh_token,
  };
}

function AuthFrame({
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
      <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <Link className="inline-flex items-center" href="/login">
          <Image
            alt="PrithivieX"
            className="h-[150px] w-auto object-contain"
            height={150}
            preload
            src="/images/logo.png"
            width={150}
          />
        </Link>
        <h1 className="mt-8 text-2xl font-semibold text-slate-950">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        <div className="mt-6">{children}</div>
      </section>
    </main>
  );
}

export function LoginForm() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    try {
      const data = await apiRequest<TokenResponse>("/api/auth/login/", {
        method: "POST",
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      });

      login(normalizeTokens(data));
      router.replace("/");
    } catch (caught) {
      console.log("Login error:", caught);
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFrame title="Welcome back" description="Sign in to manage analysis, extraction, orders, and wallet activity.">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <ErrorMessage message={error} />
        <TextField label="Email" name="email" placeholder="you@company.com" required type="email" />
        <TextField label="Password" name="password" placeholder="Enter your password" required type="password" />
        <SubmitButton loading={loading}>Login</SubmitButton>
      </form>
      <div className="mt-6 text-sm text-slate-600">
        <Link className="font-medium text-teal-700 hover:text-teal-800" href="/forgot-password">
          Forgot password?
        </Link>
      </div>
    </AuthFrame>
  );
}

export function RegisterForm() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const hasConfirmPassword = passwordConfirm.length > 0;
  const passwordsMatch = password.length > 0 && password === passwordConfirm;
  const passwordMismatch = hasConfirmPassword && password !== passwordConfirm;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (password !== passwordConfirm) {
      setError("Password and confirm password must match exactly.");
      return;
    }

    setLoading(true);

    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    try {
      await apiRequest("/api/auth/register/", {
        method: "POST",
        body: JSON.stringify({
          full_name: form.get("name"),
          affiliation: form.get("affiliation"),
          email: form.get("email"),
          password: form.get("password"),
          confirm_password: form.get("passwordConfirm"),
        }),
      });
      setSuccess("Registration successful. Please check your email to verify your account.");
      setPassword("");
      setPasswordConfirm("");
      formElement.reset();
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <AuthFrame title="Registration complete" description="Your account has been created.">
        <div className="space-y-5">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-black">
            <p className="font-semibold">Registration successful.</p>
            <p className="mt-1">Please check your email to verify and activate your account before logging in.</p>
          </div>
          <Link
            className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
            href="/login"
          >
            Go to login
          </Link>
        </div>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame title="Create your account" description="Set up access to the PrithivieX dashboard.">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <ErrorMessage message={error} />
        <TextField label="Full name" name="name" placeholder="Your name" required />
        <TextField label="Affiliation" name="affiliation" placeholder="Company, university, or organization" required />
        <TextField label="Email" name="email" placeholder="you@company.com" required type="email" />
        <TextField
          label="Password"
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Create a password"
          required
          type="password"
          value={password}
        />
        <div>
          <TextField
            aria-invalid={passwordMismatch}
            label="Confirm password"
            name="passwordConfirm"
            onChange={(event) => setPasswordConfirm(event.target.value)}
            placeholder="Repeat password"
            required
            type="password"
            value={passwordConfirm}
          />
          {hasConfirmPassword ? (
            <p className={`mt-2 text-xs font-medium ${passwordsMatch ? "text-emerald-700" : "text-red-700"}`}>
              {passwordsMatch ? "Passwords match exactly." : "Passwords do not match."}
            </p>
          ) : null}
        </div>
        <SubmitButton loading={loading}>Register</SubmitButton>
      </form>
      <p className="mt-6 text-sm text-slate-600">
        Already have an account?{" "}
        <Link className="font-medium text-teal-700 hover:text-teal-800" href="/login">
          Login
        </Link>
      </p>
    </AuthFrame>
  );
}

export function ForgotPasswordForm() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    try {
      await apiRequest("/api/auth/forgot-password/", {
        method: "POST",
        body: JSON.stringify({ email: form.get("email") }),
      });
      setSuccess("Reset instructions have been sent if the email exists.");
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthFrame title="Reset your password" description="Enter your email and we will request a reset link from the API.">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <ErrorMessage message={error} />
        <SuccessMessage message={success} />
        <TextField label="Email" name="email" placeholder="you@company.com" required type="email" />
        <SubmitButton loading={loading}>Send reset link</SubmitButton>
      </form>
      <Link className="mt-6 inline-block text-sm font-medium text-teal-700 hover:text-teal-800" href="/login">
        Back to login
      </Link>
    </AuthFrame>
  );
}

export function ResetPasswordForm({ uidb64, token }: { uidb64: string; token: string }) {
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
      await apiRequest(`/api/auth/reset-password/${uidb64}/${token}/`, {
        method: "POST",
        body: JSON.stringify({
          new_password: form.get("newPassword"),
          confirm_password: form.get("confirmPassword"),
        }),
      });
      setSuccess("Password reset successful. You can now log in.");
      setNewPassword("");
      setConfirmPassword("");
      formElement.reset();
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <AuthFrame title="Password changed" description="Your password was updated successfully. You can log in now.">
        <div className="space-y-4">
          <SuccessMessage message={success} />
          <Link
            className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
            href="/login"
          >
            Login
          </Link>
        </div>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame title="Choose a new password" description="Enter and confirm your new password.">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <ErrorMessage message={error} />
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
        <SubmitButton loading={loading}>Reset password</SubmitButton>
      </form>
      <Link className="mt-6 inline-block text-sm font-medium text-teal-700 hover:text-teal-800" href="/login">
        Back to login
      </Link>
    </AuthFrame>
  );
}

export function VerifyEmailResult({ uidb64, token }: { uidb64: string; token: string }) {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  type VerifyEmailResponse = {
    message?: string;
    detail?: string;
  };

  useEffect(() => {
    let active = true;

    apiRequest<VerifyEmailResponse>(`/api/auth/verify-email/${uidb64}/${token}/`, {
      method: "GET",
    })
      .then((data) => {
        if (active) {
          setSuccess(data?.message || data?.detail || "Your email has been verified. You can now log in.");
        }
      })
      .catch((caught) => {
        if (active) {
          setError(getErrorMessage(caught));
        }
      });

    return () => {
      active = false;
    };
  }, [token, uidb64]);

  return (
    <AuthFrame title="Email verification" description="We are confirming your verification link.">
      <div className="space-y-4">
        <ErrorMessage message={error} />
        <SuccessMessage message={success || (!error ? "Verifying email..." : "")} />
        <Link
          className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
          href="/login"
        >
          Go to login
        </Link>
      </div>
    </AuthFrame>
  );
}
