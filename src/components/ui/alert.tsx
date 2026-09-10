import type * as React from "react";
import { cn } from "@/lib/utils";

export function Alert({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "destructive" | "success";
}) {
  const variants = {
    default: "border-slate-200 bg-white text-slate-700",
    destructive: "border-red-200 bg-red-50 text-red-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };

  return <div className={cn("rounded-lg border px-4 py-3 text-sm", variants[variant], className)} {...props} />;
}
