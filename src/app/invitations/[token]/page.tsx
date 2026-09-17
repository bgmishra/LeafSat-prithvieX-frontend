import { InvitationAcceptForm } from "@/components/invitations/InvitationAcceptForm";

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return <InvitationAcceptForm token={token} />;
}
