import { JobStatus } from "@/components/JobStatus";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  return <JobStatus jobId={jobId} />;
}
