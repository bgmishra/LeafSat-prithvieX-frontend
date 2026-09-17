import { ChangePasswordContent } from "@/components/account-pages";
import { PageHeader } from "@/components/ui";

export default function ChangePasswordPage() {
  return (
    <>
    <div className="lg:px-8 lg:py-8">
      <PageHeader
        eyebrow="Security"
        title="Change password"
        description="Update your password using the authenticated change-password endpoint."
      />
      <ChangePasswordContent />
    </div>
    </>
  );
}

