import type * as React from "react";
import { cn } from "@/lib/utils";

export type RadioGroupOption = {
  description?: string;
  label: string;
  value: string;
};

export function RadioGroup({
  className,
  name,
  onValueChange,
  options,
  value,
}: {
  className?: string;
  name: string;
  onValueChange: (value: string) => void;
  options: RadioGroupOption[];
  value: string;
}) {
  return (
    <div className={cn("grid gap-2", className)} role="radiogroup">
      {options.map((option) => {
        const checked = value === option.value;

        return (
          <label
            className={cn(
              "cursor-pointer rounded-md border p-3 transition-colors",
              checked ? "border-teal-600 bg-teal-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
            )}
            key={option.value}
          >
            <span className="flex items-center gap-3">
              <input
                checked={checked}
                className="h-4 w-4 accent-teal-700"
                name={name}
                onChange={() => onValueChange(option.value)}
                type="radio"
                value={option.value}
              />
              <span className="font-semibold text-slate-900">{option.label}</span>
            </span>
            {option.description ? (
              <span className="mt-1 block pl-7 text-xs leading-5 text-slate-500">{option.description}</span>
            ) : null}
          </label>
        );
      })}
    </div>
  );
}

export function RadioGroupItem(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input type="radio" {...props} />;
}
