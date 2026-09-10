"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/config/env";
import { clearTokens, getTokens } from "@/store/auth";

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

export function useApiClient() {
  const router = useRouter();

  const request = useCallback(async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers);
    const access = getTokens()?.access;

    if (!headers.has("Content-Type") && options.body && !(options.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }

    if (access) {
      headers.set("Authorization", `Bearer ${access}`);
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
    const data = await parseResponse(response);

    if (response.status === 401) {
      clearTokens();
      router.replace("/login");
      throw new AdminApiError(response.status, data);
    }

    if (!response.ok) {
      throw new AdminApiError(response.status, data);
    }

    return data as T;
  }, [router]);

  return { request };
}
