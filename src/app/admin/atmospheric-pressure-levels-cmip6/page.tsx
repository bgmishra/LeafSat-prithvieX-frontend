"use client";

import { AdminResourcePage } from "@/admin/components/AdminResourcePage";
import { resourceConfigs } from "@/admin/config/resources";

export default function Page() {
  return <AdminResourcePage config={resourceConfigs.atmosphericPressureLevelsCmip6} />;
}
