import { ClientsWorkspace } from "@/components/invitations/ClientsWorkspace";
import { PageHeader } from "@/components/ui";

export default function AdminClientsPage() {
  return (
    <div className="grid gap-6">
      <PageHeader
        description="Invite companies to LeafSat, review who has completed registration, and suspend or restore access."
        eyebrow="Administration"
        title="Client companies"
      />
      <ClientsWorkspace />
    </div>
  );
}
