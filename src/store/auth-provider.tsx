"use client";

import { createContext, useContext, useEffect, useMemo, useReducer } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearTokens, getTokens, setTokens } from "@/store/auth";
import type { AuthTokens } from "@/store/auth";

type AuthStatus = "checking" | "authenticated" | "guest";

type AuthState = {
  status: AuthStatus;
  tokens: AuthTokens | null;
};

type AuthAction =
  | { type: "session_loaded"; tokens: AuthTokens | null }
  | { type: "login"; tokens: AuthTokens }
  | { type: "logout" };

type AuthContextValue = {
  status: AuthStatus;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isReady: boolean;
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
      };
    case "login":
      return {
        status: "authenticated",
        tokens: action.tokens,
      };
    case "logout":
      return {
        status: "guest",
        tokens: null,
      };
    default:
      return state;
  }
}

export function isPublicPath(pathname: string) {
  return publicRoutePrefixes.some((prefix) => pathname.startsWith(prefix));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, {
    status: "checking",
    tokens: null,
  });
  const pathname = usePathname();
  const router = useRouter();

  const isPublicRoute = isPublicPath(pathname);
  const isReady = state.status !== "checking";
  const isAuthenticated = state.status === "authenticated";

  useEffect(() => {
    queueMicrotask(() => {
      dispatch({ type: "session_loaded", tokens: getTokens() });
    });
  }, []);

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.storageArea === window.localStorage) {
        dispatch({ type: "session_loaded", tokens: getTokens() });
      }
    }

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!isAuthenticated && !isPublicRoute) {
      router.replace("/login");
    }
  }, [isAuthenticated, isPublicRoute, isReady, router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status: state.status,
      tokens: state.tokens,
      isAuthenticated,
      isReady,
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
    [isAuthenticated, isReady, router, state.status, state.tokens],
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
        Redirecting to login...
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
