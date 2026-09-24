import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Empty state: icon tile, bold headline, one line of help and an optional action. */
export function IconEmptyState({
  action,
  className,
  description,
  icon: Icon,
  title,
}: {
  action?: React.ReactNode;
  className?: string;
  description: React.ReactNode;
  icon: LucideIcon;
  title: string;
}) {
  return (
    <div className={cn("rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center", className)}>
      <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
        <Icon aria-hidden="true" className="size-6" />
      </div>
      <h2 className="mt-4 text-base font-semibold text-slate-950">{title}</h2>
      <p className="mx-auto mt-1 max-w-sm text-sm text-slate-600">{description}</p>
      {action ? <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}
