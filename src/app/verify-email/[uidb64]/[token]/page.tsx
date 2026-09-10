import { VerifyEmailResult } from "@/components/auth-forms";

export default async function VerifyEmailPage({
  params,
}: {
  params: Promise<{ uidb64: string; token: string }>;
}) {
  const { uidb64, token } = await params;
  console.log("params", uidb64);
  console.log("params", token);
  console.log("parameters")
  return <VerifyEmailResult token={token} uidb64={uidb64} />;
}

