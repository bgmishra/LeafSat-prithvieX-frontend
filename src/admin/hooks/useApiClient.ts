"use client";

import { useCallback } from "react";
import { ApiError, apiRequest } from "@/api/client";

export class AdminApiError extends Error {
  status: number;
  payload: unknown;

  constructor(status: number, payload: unknown) {
    super(readErrorMessage(status, payload));
    this.name = "AdminApiError";
    this.status = status;
    this.payload = payload;
  }
}

function readErrorMessage(status: number, payload: unknown) {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const message = record.detail || record.message || record.error;

    if (typeof message === "string") {
      return message;
    }
  }

  if (status === 403) {
    return "You do not have permission to perform this action.";
  }

  return status ? `Request failed with status ${status}` : "Request failed";
}

/**
 * The admin screens' request helper.
 *
 * It delegates to the shared client rather than talking to fetch itself, so it
 * inherits the access-token refresh. It used to treat any 401 as the end of the
 * session and bounce straight to the login screen, which signed people out the
 * first time their hour-long access token lapsed even though their refresh token
 * was good for another week. Deciding a session is over now happens in one place
 * — see expireSession in store/auth — and AuthProvider does the redirecting.
 */
export function useApiClient() {
  const request = useCallback(async function request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    try {
      return await apiRequest<T>(path, { ...options, auth: true });
    } catch (caught) {
      if (caught instanceof ApiError) {
        throw new AdminApiError(caught.status, caught.payload);
      }
      throw caught;
    }
  }, []);

  return { request };
}
