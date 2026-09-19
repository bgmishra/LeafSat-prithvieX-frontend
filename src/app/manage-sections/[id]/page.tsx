import { SectionDetailWorkspace } from "@/components/sections/SectionDetailWorkspace";

export default async function SectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <SectionDetailWorkspace sectionId={id} />;
}
