"use client";

import { createContext, useContext, useEffect, useMemo, useReducer } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  SESSION_EXPIRED_EVENT,
  clearTokens,
  getTokens,
  getUsableTokens,
  setTokens,
} from "@/store/auth";
import type { AuthTokens } from "@/store/auth";

type AuthStatus = "checking" | "authenticated" | "guest";

type AuthState = {
  status: AuthStatus;
  tokens: AuthTokens | null;
  expired: boolean;
};

type AuthAction =
  | { type: "session_loaded"; tokens: AuthTokens | null }
  | { type: "login"; tokens: AuthTokens }
  | { type: "logout" }
  | { type: "session_expired" };

type AuthContextValue = {
  status: AuthStatus;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isReady: boolean;
  /** Set when the session ended on its own rather than by logging out. */
  expired: boolean;
  login: (tokens: Partial<AuthTokens>) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// LeafSat is invitation only: nothing is browsable without an account. The only
// routes a signed-out visitor may reach are the ones that get them signed in.
const publicRoutePrefixes = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/invitations",
];

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "session_loaded":
      return {
        status: action.tokens ? "authenticated" : "guest",
        tokens: action.tokens,
        // A session that was never there did not expire; only drop the notice
        // once somebody is actually signed in again.
        expired: action.tokens ? false : state.expired,
      };
    case "login":
      return {
        status: "authenticated",
        tokens: action.tokens,
        expired: false,
      };
    case "logout":
      return {
        status: "guest",
        tokens: null,
        expired: false,
      };
    case "session_expired":
      return {
        status: "guest",
        tokens: null,
        expired: true,
      };
    default:
      return state;
  }
}

export function isPublicPath(pathname: string) {
  return publicRoutePrefixes.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Sanitise a `?next=` value before anyone navigates to it.
 *
 * Whatever arrives in the query string is attacker-controlled: a link to
 * `/login?next=https://evil.example` would otherwise turn our own login page
 * into a redirector that lands freshly-authenticated users on someone else's
 * site. Only a same-origin absolute path is allowed through.
 *
 * `//evil.example` and `/\evil.example` are rejected too — browsers read both
 * as protocol-relative URLs, so neither is the local path it appears to be.
 */
export function safeNextPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/")) {
    return null;
  }

  if (value.startsWith("//") || value.startsWith("/\\")) {
    return null;
  }

  // Bouncing back to an auth route after signing in just loops.
  if (isPublicPath(value)) {
    return null;
  }

  return value;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, {
    status: "checking",
    tokens: null,
    expired: false,
  });
  const pathname = usePathname();
  const router = useRouter();

  const isPublicRoute = isPublicPath(pathname);
  const isReady = state.status !== "checking";
  const isAuthenticated = state.status === "authenticated";

  useEffect(() => {
    queueMicrotask(() => {
      // getUsableTokens, not getTokens: a refresh token that ran out while the
      // tab was closed is not a session, and treating it as one would render the
      // whole app before the first request bounced the user back out.
      const tokens = getUsableTokens();

      if (!tokens && getTokens()) {
        clearTokens();
        dispatch({ type: "session_expired" });
        return;
      }

      dispatch({ type: "session_loaded", tokens });
    });
  }, []);

  useEffect(() => {
    // Another tab signed in or out.
    function handleStorage(event: StorageEvent) {
      if (event.storageArea === window.localStorage) {
        dispatch({ type: "session_loaded", tokens: getUsableTokens() });
      }
    }

    // This tab discovered the session is over — see expireSession in store/auth.
    function handleExpired() {
      dispatch({ type: "session_expired" });
    }

    window.addEventListener("storage", handleStorage);
    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpired);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpired);
    };
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!isAuthenticated && !isPublicRoute) {
      // Remember where they were headed, so signing in puts them back there
      // rather than dumping everyone on the dashboard. Read off the location
      // rather than a hook so the query string survives too, and so the
      // provider does not need a Suspense boundary around it.
      const next = safeNextPath(window.location.pathname + window.location.search);
      router.replace(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
    }
  }, [isAuthenticated, isPublicRoute, isReady, router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status: state.status,
      tokens: state.tokens,
      isAuthenticated,
      isReady,
      expired: state.expired,
      login(tokens) {
        const fallback = getTokens();
        const access = tokens.access || fallback?.access;
        const refresh = tokens.refresh || fallback?.refresh;

        if (!access || !refresh) {
          return;
        }

        const nextTokens: AuthTokens = { access, refresh };

        setTokens(nextTokens);
        dispatch({ type: "login", tokens: nextTokens });
      },
      logout() {
        clearTokens();
        dispatch({ type: "logout" });
        router.replace("/login");
      },
    }),
    [isAuthenticated, isReady, router, state.expired, state.status, state.tokens],
  );

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-medium text-slate-500">
        Loading LeafSat...
      </div>
    );
  }

  if (!isAuthenticated && !isPublicRoute) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-medium text-slate-500">
        {state.expired ? "Your session has expired. Taking you to login..." : "Redirecting to login..."}
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
