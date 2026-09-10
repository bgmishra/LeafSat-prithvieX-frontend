import type { Metadata } from "next";
import { headers } from "next/headers";
import { ResultWmsMap } from "@/components/ResultWmsMap";

type SharedResultMetadata = {
  orderName?: string;
  serviceName?: string;
  startDate?: string;
  endDate?: string;
  sharePreviewUrl?: string;
};

function backendApiUrl() {
  const configured =
    process.env.NEXT_PUBLIC_DJANGO_API_URL?.replace(/\/$/, "") ||
    `${process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "")}/api`;
  const versionPrefix = configured.endsWith("/api") ? "/v1" : "";
  return `${configured}${versionPrefix}`;
}

async function getSharedResultMetadata(shareId: string) {
  try {
    const response = await fetch(
      `${backendApiUrl()}/processing/shared/${shareId}/map-metadata/`,
      { cache: "no-store" }
    );
    return response.ok ? ((await response.json()) as SharedResultMetadata) : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ shareId: string }>;
  searchParams: Promise<{ preview?: string | string[] }>;
}): Promise<Metadata> {
  const { shareId } = await params;
  const query = await searchParams;
  const result = await getSharedResultMetadata(shareId);
  const title = result?.orderName
    ? `${result.orderName} | PrithivieX`
    : `${result?.serviceName || "Analysis result"} | PrithivieX`;
  const dateRange =
    result?.startDate && result?.endDate
      ? ` for ${result.startDate} to ${result.endDate}`
      : "";
  const description = `Explore this shared geospatial analysis${dateRange} on PrithivieX. View interactive maps, time-series charts, and processed Earth observation insights.`;
  const requestHeaders = await headers();
  const forwardedHost =
    requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
  const forwardedProtocol =
    requestHeaders.get("x-forwarded-proto") ||
    (forwardedHost?.startsWith("localhost") ? "http" : "https");
  const requestSiteUrl = forwardedHost
    ? `${forwardedProtocol}://${forwardedHost}`
    : "http://localhost:3000";
  const configuredSiteUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_FRONTEND_URL ||
    ""
  ).replace(/\/$/, "");
  const siteUrl =
    configuredSiteUrl && !/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(configuredSiteUrl)
      ? configuredSiteUrl
      : requestSiteUrl;
  const canonicalUrl = `${siteUrl}/shared/${shareId}`;
  const previewVersion =
    typeof query.preview === "string" && query.preview
      ? query.preview
      : null;
  const socialUrl = previewVersion
    ? `${canonicalUrl}?preview=${encodeURIComponent(previewVersion)}`
    : canonicalUrl;
  const socialImageUrl = result?.sharePreviewUrl
    ? `${canonicalUrl}/preview.png${
        previewVersion ? `?preview=${encodeURIComponent(previewVersion)}` : ""
      }`
    : "";
  const images = socialImageUrl
    ? [
        {
          url: socialImageUrl,
          secureUrl: socialImageUrl,
          width: 1200,
          height: 627,
          type: "image/png",
          alt: `Map preview for ${result?.orderName || result?.serviceName || "the shared analysis"}`,
        },
      ]
    : [];

  return {
    title,
    description,
    authors: [{ name: "PrithivieX", url: siteUrl }],
    creator: "PrithivieX",
    publisher: "PrithivieX",
    alternates: { canonical: canonicalUrl },
    other: socialImageUrl
      ? { image: socialImageUrl }
      : {},
    openGraph: {
      type: "website",
      url: socialUrl,
      siteName: "PrithivieX",
      title,
      description,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: socialImageUrl
        ? [
            {
              url: socialImageUrl,
              alt: `Map preview for ${result?.orderName || result?.serviceName || "the shared analysis"}`,
            },
          ]
        : [],
    },
  };
}

export default async function SharedResultPage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = await params;
  return <ResultWmsMap shareId={shareId} />;
}
