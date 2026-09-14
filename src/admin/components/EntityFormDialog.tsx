"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import type { BackendValidationErrors, ResourceConfig, SelectOption } from "@/admin/types/resources";
import { AdminApiError } from "@/admin/hooks/useApiClient";
import { CheckboxInput, DateInput, FileInput, FormMultiSelect, FormSelect, MoneyInput, NumberInput, ReadonlyInput, TextInput } from "./FormFields";
import { GeometryInput } from "./GeometryInput";
import { useToast } from "./ToastProvider";

function isFileOrGeometryFieldSatisfied(field: ResourceConfig["fields"][number], values: Record<string, unknown>) {
  if (values[field.name] instanceof File) {
    return true;
  }

  if (field.type === "geometry") {
    return Boolean(values[field.geojsonFieldName || `${field.name}_geojson`]);
  }

  return false;
}

function selectValue(value: unknown) {
  if (value && typeof value === "object") {
    return String((value as Record<string, unknown>).id ?? "");
  }

  return value == null ? "" : String(value);
}

function normalizeDefaults(config: ResourceConfig, item: Record<string, unknown> | null) {
  const values: Record<string, unknown> = { ...(config.defaultValues || {}) };

  config.fields.forEach((field) => {
    if (field.readonly) {
      return;
    }

    const value = item?.[field.name] ?? values[field.name];

    if (field.type === "multiselect") {
      values[field.name] = Array.isArray(value) ? value.map(selectValue).filter(Boolean) : [];
    } else if (field.type === "boolean") {
      values[field.name] = Boolean(value);
    } else if (field.type === "select") {
      values[field.name] = selectValue(value);
    } else if (field.type === "file" || field.type === "geometry") {
      // Files (and drawn geometry) are never returned by the API (write-only), so
      // there is nothing to prefill on edit. Leaving this undefined lets an edit
      // submit without a new value keep the existing value on the backend instead
      // of clearing it.
      values[field.name] = undefined;
      if (field.type === "geometry") {
        values[field.geojsonFieldName || `${field.name}_geojson`] = undefined;
      }
    } else {
      values[field.name] = value ?? "";
    }
  });

  return values;
}

export function EntityFormDialog({
  config,
  item,
  onClose,
  onCreate,
  onUpdate,
  open,
  options,
}: {
  config: ResourceConfig;
  item: Record<string, unknown> | null;
  onClose: () => void;
  onCreate: (values: Record<string, unknown>) => Promise<void>;
  onUpdate: (id: string | number, values: Record<string, unknown>) => Promise<void>;
  open: boolean;
  options: Record<string, SelectOption[]>;
}) {
  const toast = useToast();
  const [backendErrors, setBackendErrors] = useState<BackendValidationErrors>({});
  const [saving, setSaving] = useState(false);
  const defaultValues = useMemo(() => normalizeDefaults(config, item), [config, item]);
  const resolver = zodResolver(config.schema as never) as Resolver<Record<string, unknown>>;
  const form = useForm<Record<string, unknown>>({
    defaultValues,
    resolver,
  });

  useEffect(() => {
    if (open) {
      form.reset(defaultValues);
      queueMicrotask(() => setBackendErrors({}));
    }
  }, [defaultValues, form, open]);

  if (!open) {
    return null;
  }

  const isEdit = Boolean(item);
  const id = item?.[config.idKey || "id"] as string | number | undefined;

  async function submit(values: Record<string, unknown>) {
    setBackendErrors({});

    const missingRequiredFile = !isEdit
      ? config.fields.find(
          (field) =>
            (field.type === "file" || field.type === "geometry") &&
            field.required &&
            !isFileOrGeometryFieldSatisfied(field, values),
        )
      : undefined;

    if (missingRequiredFile) {
      setBackendErrors({ [missingRequiredFile.name]: "This field is required." });
      return;
    }

    setSaving(true);

    try {
      if (isEdit && id !== undefined) {
        await onUpdate(id, values);
      } else {
        await onCreate(values);
      }
      onClose();
    } catch (caught) {
      if (caught instanceof AdminApiError && caught.payload && typeof caught.payload === "object") {
        setBackendErrors(caught.payload as BackendValidationErrors);
        toast.notify({ title: caught.status === 403 ? "You do not have permission to perform this action." : caught.message, type: "error" });
      } else if (caught instanceof Error) {
        setBackendErrors({ non_field_errors: caught.message });
        toast.notify({ title: caught.message, type: "error" });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-slate-950/50">
      <div className="h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">
              {isEdit ? "Edit" : "Create"} {config.title}
            </h2>
            <p className="mt-1 text-sm text-slate-500">Fill in the fields below and save changes.</p>
          </div>
          <button className="rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100" onClick={onClose} type="button">
            Close
          </button>
        </div>

        {backendErrors.non_field_errors ? (
          <div className="mt-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {String(backendErrors.non_field_errors)}
          </div>
        ) : null}

        <form className="mt-6 space-y-5" onSubmit={form.handleSubmit(submit)}>
          {config.fields.map((field) => {
            if (field.readonly || field.type === "readonly") {
              return <ReadonlyInput field={field} key={field.name} value={item?.[field.name]} />;
            }

            if (field.type === "select") {
              return (
                <FormSelect
                  backendErrors={backendErrors}
                  disabled={saving}
                  field={field}
                  form={form}
                  key={field.name}
                  options={options[field.name] || field.options || []}
                />
              );
            }

            if (field.type === "multiselect") {
              return (
                <FormMultiSelect
                  backendErrors={backendErrors}
                  disabled={saving}
                  field={field}
                  form={form}
                  key={field.name}
                  options={options[field.name] || field.options || []}
                />
              );
            }

            if (field.type === "number") {
              return (
                <NumberInput
                  backendErrors={backendErrors}
                  disabled={saving}
                  field={field}
                  form={form}
                  key={field.name}
                />
              );
            }

            if (field.type === "money") {
              return (
                <MoneyInput
                  backendErrors={backendErrors}
                  disabled={saving}
                  field={field}
                  form={form}
                  key={field.name}
                />
              );
            }

            if (field.type === "date") {
              return (
                <DateInput
                  backendErrors={backendErrors}
                  disabled={saving}
                  field={field}
                  form={form}
                  key={field.name}
                />
              );
            }

            if (field.type === "boolean") {
              return (
                <CheckboxInput
                  backendErrors={backendErrors}
                  disabled={saving}
                  field={field}
                  form={form}
                  key={field.name}
                />
              );
            }

            if (field.type === "file") {
              return (
                <FileInput
                  backendErrors={backendErrors}
                  disabled={saving}
                  field={field}
                  form={form}
                  key={field.name}
                />
              );
            }

            if (field.type === "geometry") {
              return (
                <GeometryInput
                  backendErrors={backendErrors}
                  disabled={saving}
                  field={field}
                  form={form}
                  key={field.name}
                />
              );
            }

            return (
              <TextInput
                backendErrors={backendErrors}
                disabled={saving}
                field={field}
                form={form}
                key={field.name}
              />
            );
          })}

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
            <button
              className="min-h-10 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              disabled={saving}
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="min-h-10 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
              disabled={saving}
              type="submit"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
