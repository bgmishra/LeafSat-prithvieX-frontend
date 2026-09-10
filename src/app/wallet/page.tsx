import { PageHeader, WalletContent } from "@/components/workspace-pages";

export default function WalletPage() {
  return (
    <>
      <div className="mx-auto flex w-full flex-col gap-10 px-10 py-10 sm:px-0 lg:px-10 lg:pt-10">
          <PageHeader
            eyebrow="Billing"
            title="Wallet"
            description="View balance, recent transactions, and top-up controls."
          />
          <WalletContent />
      </div>
    </>
  );
}

