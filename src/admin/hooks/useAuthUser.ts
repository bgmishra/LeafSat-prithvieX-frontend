"use client";

import { useEffect, useMemo, useState } from "react";
import type { AuthUser, UserRole } from "@/admin/types/resources";
import { AdminApiError, useApiClient } from "./useApiClient";

function normalizeRole(user: AuthUser | null): UserRole {
  if (!user) {
    return "user";
  }

  const role = (user.user_type || user.role || "").toLowerCase();
  const normalizedRole = role.replace(/[_\s-]+/g, "");

  if (normalizedRole === "superadmin" || user.is_superuser) {
    return "superadmin";
  }

  if (normalizedRole === "admin" || user.is_admin || user.is_staff) {
    return "admin";
  }

  return "user";
}

export function useAuthUser({ enabled = true }: { enabled?: boolean } = {}) {
  const { request } = useApiClient();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    let active = true;

    if (!enabled) {
      queueMicrotask(() => {
        if (active) {
          setUser(null);
          setError("");
          setLoading(false);
        }
      });

      return () => {
        active = false;
      };
    }

    void Promise.resolve().then(() => {
      if (!active) {
        return;
      }

      setLoading(true);
      request<AuthUser>("/api/auth/profile/", { method: "GET" })
        .then((data) => {
          if (active) {
            setUser(data);
          }
        })
        .catch((caught) => {
          if (active && caught instanceof AdminApiError && caught.status !== 401) {
            setError(caught.message);
          }
        })
        .finally(() => {
          if (active) {
            setLoading(false);
          }
        });
    });

    return () => {
      active = false;
    };
  }, [enabled, request]);

  const role = useMemo(() => normalizeRole(user), [user]);
  const isAdmin = role === "admin" || role === "superadmin";

  return { error, isAdmin, loading, role, user };
}
