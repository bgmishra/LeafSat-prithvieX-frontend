"use client";

import { API_BASE_URL } from "@/config/env";
import { clearTokens, getTokens, setTokens } from "@/store/auth";

type ApiOptions = RequestInit & {
  auth?: boolean;
};

type ApiErrorPayload = {
  detail?: string;
  message?: string;
  error?: string;
  [key: string]: unknown;
};

export class ApiError extends Error {
  status: number;
  payload: ApiErrorPayload | null;

  constructor(status: number, payload: ApiErrorPayload | null) {
    const fallback = status ? `Request failed with status ${status}` : "Request failed";
    super(payload?.detail || payload?.message || payload?.error || fallback);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

async function parseResponse(response: Response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { detail: text };
  }
}

async function refreshAccessToken() {
  const refresh = getTokens()?.refresh;

  if (!refresh) {
    return null;
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });

  const data = await parseResponse(response);

  if (!response.ok || !data?.access) {
    clearTokens();
    return null;
  }

  setTokens({ access: data.access });
  return data.access as string;
}

export async function apiRequest<T>(
  path: string,
  options: ApiOptions = {},
  retried = false,
): Promise<T> {
  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type") && options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (options.auth) {
    const access = getTokens()?.access;
    if (access) {
      headers.set("Authorization", `Bearer ${access}`);
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && options.auth && !retried) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return apiRequest<T>(path, options, true);
    }
  }

  const data = await parseResponse(response);

  if (!response.ok) {
    throw new ApiError(response.status, data);
  }

  return data as T;
}

export function getErrorMessage(error: unknown) {
  if (error instanceof ApiError && error.payload) {
    const fieldErrors = Object.entries(error.payload)
      .filter(([, value]) => Array.isArray(value) || typeof value === "string")
      .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : value}`);

    return fieldErrors[0] || error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}
