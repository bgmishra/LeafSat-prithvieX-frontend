import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type PageHeaderProps = {
  title: string;
  eyebrow?: string;
  description: string;
  action?: React.ReactNode;
};

export function PageHeader({ title, eyebrow, description, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? (
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">{eyebrow}</p>
        ) : null}
        <h1 className="mt-2 text-3xl font-semibold text-slate-950 sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function ActionCard({
  title,
  href,
  icon,
  actionLabel,
}: {
  title: string;
  href: string;
  icon: React.ReactNode;
  actionLabel: string;
}) {
  return (
    <Panel className="flex min-h-64 flex-col justify-between gap-8">
      <div>
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
          {icon}
        </div>
        <h2 className="mt-6 text-2xl font-semibold text-slate-950">{title}</h2>
      </div>
      <Link
        className={buttonVariants({ className: "bg-slate-950 hover:bg-slate-800" })}
        href={href}
      >
        {actionLabel}
      </Link>
    </Panel>
  );
}

export function TextField({
  label,
  name,
  type = "text",
  placeholder,
  required = false,
  defaultValue,
  ...inputProps
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
} & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "defaultValue" | "name" | "placeholder" | "required" | "type"
>) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input
        className="mt-2"
        defaultValue={defaultValue}
        id={name}
        name={name}
        placeholder={placeholder}
        required={required}
        type={type}
        {...inputProps}
      />
    </div>
  );
}

export function TextArea({
  label,
  name,
  placeholder,
  required = false,
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Textarea
        className="mt-2"
        id={name}
        name={name}
        placeholder={placeholder}
        required={required}
      />
    </div>
  );
}

export function SubmitButton({
  children,
  loading = false,
}: {
  children: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <Button
      className="w-full sm:w-auto"
      disabled={loading}
      type="submit"
    >
      {loading ? "Working..." : children}
    </Button>
  );
}

export function ErrorMessage({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <Alert variant="destructive">{message}</Alert>;
}

export function SuccessMessage({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <Alert variant="success">{message}</Alert>;
}

export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <Card className="flex min-h-40 items-center justify-center border-dashed text-sm font-medium text-slate-500">
      {label}
    </Card>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card className="border-dashed bg-slate-50 p-6 text-center">
      <h3 className="text-base font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </Card>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const classes =
    normalized === "completed"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : normalized === "failed"
        ? "bg-red-50 text-red-700 ring-red-200"
        : normalized === "processing"
          ? "bg-amber-50 text-amber-700 ring-amber-200"
          : "bg-slate-100 text-slate-700 ring-slate-200";

  return <Badge className={classes}>{status}</Badge>;
}
