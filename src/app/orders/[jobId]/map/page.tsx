import { ResultWmsMap } from "@/components/ResultWmsMap";

export default async function OrderMapPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  return <ResultWmsMap jobId={jobId} />;
}
