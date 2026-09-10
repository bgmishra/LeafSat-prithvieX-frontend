"use client";

export type AuthTokens = {
  access: string;
  refresh: string;
};

const ACCESS_TOKEN_KEY = "prithiviex_access_token";
const REFRESH_TOKEN_KEY = "prithiviex_refresh_token";

export function getTokens(): AuthTokens | null {
  if (typeof window === "undefined") {
    return null;
  }

  const access = window.localStorage.getItem(ACCESS_TOKEN_KEY);
  const refresh = window.localStorage.getItem(REFRESH_TOKEN_KEY);

  if (!access || !refresh) {
    return null;
  }

  return { access, refresh };
}

export function setTokens(tokens: Partial<AuthTokens>) {
  if (typeof window === "undefined") {
    return;
  }

  if (tokens.access) {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access);
  }

  if (tokens.refresh) {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh);
  }
}

export function clearTokens() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function hasAuthToken() {
  return Boolean(getTokens()?.access);
}
