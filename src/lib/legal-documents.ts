import { API_BASE_URL } from "@/config/env";

export type LegalDocument = {
  title: string;
  slug: string;
  version: string;
  effective_date?: string | null;
  content: string;
  content_format: "markdown";
  updated_at?: string | null;
};

export async function getActiveLegalDocument(slug: string) {
  const response = await fetch(`${API_BASE_URL}/api/v1/legal/${encodeURIComponent(slug)}/`, {
    cache: "no-store",
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Unable to load legal document: ${response.status}`);
  }

  return (await response.json()) as LegalDocument;
}

export async function getActiveTermsOfService() {
  const response = await fetch(`${API_BASE_URL}/api/v1/legal/terms/`, {
    cache: "no-store",
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Unable to load Terms of Service: ${response.status}`);
  }

  return (await response.json()) as LegalDocument;
}
