import { API_BASE_URL } from "@/config/env";

export type ServicePageService = {
  id: number;
  name: string;
  name_label?: string;
  name_value?: string;
  service_category?: string | null;
  display_order?: number | null;
  year_greater_than?: number | null;
  year_less_than?: number | null;
  base_price?: string | number | null;
  area_with_base_price_ha?: string | number | null;
  temporal_resolution_types?: Array<{
    id: number;
    temporal_type: string;
    temporal_type_label?: string;
    temporal_type_value?: string;
    max_range?: number | null;
  }>;
  data_sources?: Array<{
    id: number;
    source_name: string;
    source_name_label?: string;
    source_name_value?: string;
  }>;
};

export type ServicePageListItem = {
  id: number;
  name: string;
  name_label?: string;
  name_value?: string;
  service_category?: string | null;
  page_id?: number | null;
  page_title?: string | null;
  slug?: string | null;
  status: "not_created" | "draft" | "published";
  is_published?: boolean | null;
  published_at?: string | null;
  page_updated_at?: string | null;
};

export type RelatedServicePage = {
  id: number;
  slug: string;
  title: string;
  short_description?: string | null;
  service_category?: string | null;
};

export type ServiceDetailPage = {
  id?: number;
  service?: ServicePageService | null;
  slug?: string;
  title?: string;
  short_description?: string | null;
  cover_image?: string | null;
  cover_image_url?: string | null;
  markdown_content?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  is_published?: boolean;
  status?: "not_created" | "draft" | "published";
  published_at?: string | null;
  related_services?: RelatedServicePage[];
  created_at?: string;
  updated_at?: string;
};

export type ServicePageUploadResponse = {
  id: number;
  image_url: string;
  alt_text?: string | null;
  markdown: string;
};

export function servicePageTitle(page: ServiceDetailPage) {
  return page.title || page.service?.name_label || page.service?.name || "Service page";
}

export async function getPublicServicePage(slug: string) {
  const response = await fetch(`${API_BASE_URL}/api/v1/public/service-pages/${slug}/`, {
    next: { revalidate: 300 },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Unable to load service page: ${response.status}`);
  }

  return (await response.json()) as ServiceDetailPage;
}
