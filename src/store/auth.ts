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

/**
 * Broadcast when a session ends on its own — the refresh token was rejected or
 * has run out — as opposed to the user pressing Log out.
 *
 * The `storage` event only reaches *other* tabs, so without this the tab that
 * actually discovered the expiry would clear its tokens and carry on rendering a
 * signed-in shell whose every request 401s. AuthProvider listens for it and
 * takes the user to the login screen.
 */
export const SESSION_EXPIRED_EVENT = "leafsat:session-expired";

export function expireSession() {
  const hadSession = Boolean(getTokens());
  clearTokens();

  if (typeof window !== "undefined" && hadSession) {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
}

/**
 * True when a JWT is absent, unreadable, or past its `exp`.
 *
 * Read locally only to avoid showing the app to someone whose session has
 * already lapsed; the server remains the authority on every actual request.
 */
export function isTokenExpired(token: string | undefined | null) {
  if (!token) {
    return true;
  }

  const payload = token.split(".")[1];

  if (!payload) {
    return true;
  }

  try {
    const decoded = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/")),
    ) as { exp?: number };

    // A token with no expiry claim is not something we can judge; let the
    // server decide rather than locking the user out on a guess.
    if (typeof decoded.exp !== "number") {
      return false;
    }

    return decoded.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

/**
 * The stored session, or null when it can no longer be used. A live access token
 * is not required — an expired one is refreshed on the next call — but an
 * expired *refresh* token means the session is genuinely over.
 */
export function getUsableTokens(): AuthTokens | null {
  const tokens = getTokens();

  if (!tokens || isTokenExpired(tokens.refresh)) {
    return null;
  }

  return tokens;
}
