type SharedResultMetadata = {
  sharePreviewUrl?: string;
};

function backendApiUrl() {
  const configured =
    process.env.NEXT_PUBLIC_DJANGO_API_URL?.replace(/\/$/, "") ||
    `${process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "")}/api`;
  const versionPrefix = configured.endsWith("/api") ? "/v1" : "";
  return `${configured}${versionPrefix}`;
}

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ shareId: string }> }
) {
  const { shareId } = await params;
  const metadataResponse = await fetch(
    `${backendApiUrl()}/processing/shared/${shareId}/map-metadata/`,
    { cache: "no-store" }
  );
  if (!metadataResponse.ok) {
    return new Response("Preview not found", { status: 404 });
  }

  const metadata = (await metadataResponse.json()) as SharedResultMetadata;
  if (!metadata.sharePreviewUrl) {
    return new Response("Preview not found", { status: 404 });
  }

  const sourceUrl = new URL(metadata.sharePreviewUrl);
  if (!['http:', 'https:'].includes(sourceUrl.protocol)) {
    return new Response("Invalid preview URL", { status: 502 });
  }

  const imageResponse = await fetch(sourceUrl, { cache: "no-store" });
  if (!imageResponse.ok) {
    return new Response("Preview unavailable", { status: 502 });
  }

  const image = await imageResponse.arrayBuffer();
  return new Response(image, {
    headers: {
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
      "Content-Length": String(image.byteLength),
      "Content-Type": imageResponse.headers.get("content-type") || "image/png",
    },
  });
}
