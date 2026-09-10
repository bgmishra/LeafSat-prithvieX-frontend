import type { ComponentType, ReactNode } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { z } from "zod";

export type UserRole = "admin" | "superadmin" | "user";

export type AuthUser = {
  id?: number | string;
  email?: string;
  full_name?: string;
  name?: string;
  role?: string;
  user_type?: string;
  is_staff?: boolean;
  is_superuser?: boolean;
  is_admin?: boolean;
};

export type SelectOption = {
  label: string;
  value: string;
};

export type FieldOptionSource = {
  endpoint: string;
  labelKey?: string;
  valueKey?: string;
};

export type ResourceField = {
  name: string;
  label: string;
  type: "boolean" | "date" | "text" | "number" | "money" | "select" | "multiselect" | "readonly";
  required?: boolean;
  readonly?: boolean;
  optionSource?: FieldOptionSource;
  options?: SelectOption[];
};

export type ResourceConfig = {
  key: string;
  title: string;
  description: string;
  path: string;
  endpoint: string;
  idKey?: string;
  fields: ResourceField[];
  schema: z.ZodTypeAny;
  columns: Array<{
    key: string;
    label: string;
    render?: (item: Record<string, unknown>) => ReactNode;
  }>;
  canNormalUserMutate?: boolean;
  normalUserOwnResourceOnly?: boolean;
  defaultValues?: Record<string, unknown>;
};

export type BackendValidationErrors = Record<string, string[] | string>;

export type AdminFormProps = {
  config: ResourceConfig;
  form: UseFormReturn<Record<string, unknown>>;
  backendErrors: BackendValidationErrors;
  options: Record<string, SelectOption[]>;
  isSaving: boolean;
};

export type AdminFieldComponent = ComponentType<AdminFormProps>;
