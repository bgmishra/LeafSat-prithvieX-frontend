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
  type:
    | "boolean"
    | "date"
    | "text"
    | "number"
    | "money"
    | "select"
    | "multiselect"
    | "readonly"
    | "file"
    | "geometry";
  required?: boolean;
  readonly?: boolean;
  optionSource?: FieldOptionSource;
  options?: SelectOption[];
  /** "file"/"geometry" fields only: forwarded to the upload <input type="file" accept> attribute. */
  accept?: string;
  /** "file"/"geometry" fields only: short instructions shown under the input. */
  helpText?: string;
  /**
   * "geometry" fields only: the form field name that holds a raw GeoJSON
   * Polygon/MultiPolygon geometry (e.g. drawn on a map) as an alternative to
   * uploading a file under `name`. Defaults to "{name}_geojson".
   */
  geojsonFieldName?: string;
};

export type ResourceBulkUploadConfig = {
  /** API endpoint the bulk file is POSTed to (multipart/form-data). */
  endpoint: string;
  /** Dialog/button label. Defaults to "Bulk Upload {title}". */
  label?: string;
  /** Forwarded to the <input type="file" accept> attribute. */
  accept?: string;
  /** Form field name the file is sent under. Defaults to "file". */
  fieldName?: string;
  /** Lines describing the expected columns/types, shown in the upload dialog. */
  instructions?: string[];
};

export type ResourceGeometryPreviewConfig = {
  /** Key on the item holding a GeoJSON Polygon/MultiPolygon geometry. */
  field: string;
  /** Dialog title. Defaults to "{title} Boundary". */
  label?: string;
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
  bulkUpload?: ResourceBulkUploadConfig;
  geometryPreview?: ResourceGeometryPreviewConfig;
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
