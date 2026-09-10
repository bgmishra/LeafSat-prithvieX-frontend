"use client";

import { AdminResourcePage } from "@/admin/components/AdminResourcePage";
import { resourceConfigs } from "@/admin/config/resources";

export default function Page() {
  return (
    <div className="space-y-10">
      <AdminResourcePage config={resourceConfigs.cmip6Services} />
      <AdminResourcePage config={resourceConfigs.cmip6ServiceSources} />
    </div>
  );
}
