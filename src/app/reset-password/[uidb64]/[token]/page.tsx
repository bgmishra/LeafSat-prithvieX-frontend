import { ResetPasswordForm } from "@/components/auth-forms";

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ uidb64: string; token: string }>;
}) {
  const { uidb64, token } = await params;

  return <ResetPasswordForm token={token} uidb64={uidb64} />;
}

