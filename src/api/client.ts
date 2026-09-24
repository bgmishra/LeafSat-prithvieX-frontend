"use client";

import { API_BASE_URL } from "@/config/env";
import { expireSession, getTokens, isTokenExpired, setTokens } from "@/store/auth";

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

/**
 * In-flight refresh, shared by every caller.
 *
 * A page that fires several requests at once would otherwise send several
 * refreshes with the same token. With rotation on, the first wins and the rest
 * come back rejected, logging out a user whose session was perfectly good.
 */
let pendingRefresh: Promise<string | null> | null = null;

async function requestNewAccessToken() {
  const refresh = getTokens()?.refresh;

  // Nothing to refresh with, or the refresh token itself has run out: the
  // session is over and no round trip will change that.
  if (!refresh || isTokenExpired(refresh)) {
    expireSession();
    return null;
  }

  const response = await fetch(`${API_BASE_URL}/api/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });

  const data = await parseResponse(response);

  if (!response.ok || !data?.access) {
    expireSession();
    return null;
  }

  setTokens({ access: data.access, refresh: data.refresh });
  return data.access as string;
}

function refreshAccessToken() {
  pendingRefresh ??= requestNewAccessToken().finally(() => {
    pendingRefresh = null;
  });

  return pendingRefresh;
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

/**
 * Resolve a URL the API handed us (e.g. a WMS proxy `url`) onto the API's own
 * origin, so the bearer token is only ever sent to our backend.
 *
 * The backend builds absolute URLs from the incoming request, which behind a
 * TLS-terminating proxy can come back as plain http or as an internal host
 * name. Relative paths and same-origin URLs are used as they are; an `/api/`
 * path on any other origin is rebased onto API_BASE_URL; anything else is
 * refused rather than leaking the token.
 */
export function resolveApiUrl(url: string) {
  const apiOrigin = new URL(API_BASE_URL).origin;
  const parsed = new URL(url, API_BASE_URL);

  if (parsed.origin === apiOrigin) {
    return parsed.toString();
  }

  if (parsed.pathname.startsWith("/api/")) {
    return `${API_BASE_URL}${parsed.pathname}${parsed.search}`;
  }

  throw new Error(`Refusing to send credentials to ${parsed.origin}.`);
}

/**
 * `fetch` with the stored access token, refreshing it once on a 401 exactly as
 * `apiRequest` does. Returns the raw Response, for callers that need a binary
 * body — map images from the WMS proxy, which an `<img>` tag cannot fetch
 * because it cannot send an Authorization header.
 */
export async function authorizedFetch(
  url: string,
  init: RequestInit = {},
  retried = false,
): Promise<Response> {
  const target = resolveApiUrl(url);
  const headers = new Headers(init.headers);
  const access = getTokens()?.access;

  if (access) {
    headers.set("Authorization", `Bearer ${access}`);
  }

  const response = await fetch(target, { ...init, headers });

  if (response.status === 401 && !retried) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return authorizedFetch(url, init, true);
    }
  }

  return response;
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
