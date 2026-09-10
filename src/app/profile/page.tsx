import { PageHeader, ProfileContent } from "@/components/workspace-pages";

export default function ProfilePage() {
  return (
    <>
    <div className="lg:px-5 lg:py-5">
      
      <PageHeader
        eyebrow="Account"
        title="Profile"
        description=""
      />
      <ProfileContent />

      </div>
    </>
  );
}

