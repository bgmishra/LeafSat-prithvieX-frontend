import { OrderStatusContent, PageHeader } from "@/components/workspace-pages";

export default function OrdersPage() {
  return (
    <><div className="lg:px-4 lg:py-4">
        <PageHeader
          eyebrow="Orders"
          title="Orders"
          description="Review current and recent PrithviEx orders with clear status labels."
        />
        <OrderStatusContent />
      </div>
    </>
  );
}
