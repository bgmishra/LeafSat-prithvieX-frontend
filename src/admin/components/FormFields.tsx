"use client";

import type { FieldError, UseFormReturn } from "react-hook-form";
import type { BackendValidationErrors, ResourceField, SelectOption } from "@/admin/types/resources";

export function getFieldError(
  form: UseFormReturn<Record<string, unknown>>,
  backendErrors: BackendValidationErrors,
  name: string,
) {
  const formError = form.formState.errors[name] as FieldError | undefined;
  const backendError = backendErrors[name];

  if (formError?.message) {
    return formError.message;
  }

  if (Array.isArray(backendError)) {
    return backendError.join(", ");
  }

  return backendError;
}

export function FieldErrorText({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="mt-1 text-xs font-medium text-red-600">{message}</p>;
}

export function NumberInput({
  backendErrors,
  disabled,
  field,
  form,
}: {
  backendErrors: BackendValidationErrors;
  disabled?: boolean;
  field: ResourceField;
  form: UseFormReturn<Record<string, unknown>>;
}) {
  const error = getFieldError(form, backendErrors, field.name);

  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-800">{field.label}</span>
      <input
        className="mt-2 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100"
        disabled={disabled}
        step="1"
        type="number"
        {...form.register(field.name, { valueAsNumber: true })}
      />
      <FieldErrorText message={error} />
    </label>
  );
}

export function MoneyInput({
  backendErrors,
  disabled,
  field,
  form,
}: {
  backendErrors: BackendValidationErrors;
  disabled?: boolean;
  field: ResourceField;
  form: UseFormReturn<Record<string, unknown>>;
}) {
  const error = getFieldError(form, backendErrors, field.name);

  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-800">{field.label}</span>
      <input
        className="mt-2 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100"
        disabled={disabled}
        step="0.01"
        type="number"
        {...form.register(field.name)}
      />
      <FieldErrorText message={error} />
    </label>
  );
}

export function DateInput({
  backendErrors,
  disabled,
  field,
  form,
}: {
  backendErrors: BackendValidationErrors;
  disabled?: boolean;
  field: ResourceField;
  form: UseFormReturn<Record<string, unknown>>;
}) {
  const error = getFieldError(form, backendErrors, field.name);

  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-800">{field.label}</span>
      <input
        className="mt-2 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100"
        disabled={disabled}
        type="date"
        {...form.register(field.name)}
      />
      <FieldErrorText message={error} />
    </label>
  );
}

export function FormSelect({
  backendErrors,
  disabled,
  field,
  form,
  options,
}: {
  backendErrors: BackendValidationErrors;
  disabled?: boolean;
  field: ResourceField;
  form: UseFormReturn<Record<string, unknown>>;
  options: SelectOption[];
}) {
  const error = getFieldError(form, backendErrors, field.name);

  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-800">{field.label}</span>
      <select
        className="mt-2 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100"
        disabled={disabled}
        {...form.register(field.name)}
      >
        <option value="">Select {field.label.toLowerCase()}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <FieldErrorText message={error} />
    </label>
  );
}

export function FormMultiSelect({
  backendErrors,
  disabled,
  field,
  form,
  options,
}: {
  backendErrors: BackendValidationErrors;
  disabled?: boolean;
  field: ResourceField;
  form: UseFormReturn<Record<string, unknown>>;
  options: SelectOption[];
}) {
  const error = getFieldError(form, backendErrors, field.name);

  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-800">{field.label}</span>
      <select
        className="mt-2 min-h-32 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100"
        disabled={disabled}
        multiple
        {...form.register(field.name)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <p className="mt-1 text-xs text-slate-500">Hold Ctrl/Cmd to select multiple values.</p>
      <FieldErrorText message={error} />
    </label>
  );
}

export function TextInput({
  backendErrors,
  disabled,
  field,
  form,
}: {
  backendErrors: BackendValidationErrors;
  disabled?: boolean;
  field: ResourceField;
  form: UseFormReturn<Record<string, unknown>>;
}) {
  const error = getFieldError(form, backendErrors, field.name);

  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-800">{field.label}</span>
      <input
        className="mt-2 min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100"
        disabled={disabled}
        type="text"
        {...form.register(field.name)}
      />
      <FieldErrorText message={error} />
    </label>
  );
}

export function CheckboxInput({
  backendErrors,
  disabled,
  field,
  form,
}: {
  backendErrors: BackendValidationErrors;
  disabled?: boolean;
  field: ResourceField;
  form: UseFormReturn<Record<string, unknown>>;
}) {
  const error = getFieldError(form, backendErrors, field.name);

  return (
    <label className="flex items-start gap-3 rounded-md border border-slate-200 bg-white px-3 py-3">
      <input
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600 disabled:opacity-60"
        disabled={disabled}
        type="checkbox"
        {...form.register(field.name)}
      />
      <span>
        <span className="block text-sm font-medium text-slate-800">{field.label}</span>
        <FieldErrorText message={error} />
      </span>
    </label>
  );
}

export function FileInput({
  backendErrors,
  disabled,
  field,
  form,
}: {
  backendErrors: BackendValidationErrors;
  disabled?: boolean;
  field: ResourceField;
  form: UseFormReturn<Record<string, unknown>>;
}) {
  const error = getFieldError(form, backendErrors, field.name);
  const currentValue = form.watch(field.name);
  const selectedFile = currentValue instanceof File ? currentValue : undefined;

  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-800">{field.label}</span>
      <input
        accept={field.accept}
        className="mt-2 block w-full text-sm text-slate-700 file:mr-3 file:min-h-11 file:cursor-pointer file:rounded-md file:border-0 file:bg-teal-700 file:px-4 file:text-sm file:font-semibold file:text-white file:transition hover:file:bg-teal-800 disabled:opacity-60"
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0];
          form.setValue(field.name, file, { shouldDirty: true, shouldValidate: true });
        }}
        type="file"
      />
      {field.helpText ? <p className="mt-1 text-xs text-slate-500">{field.helpText}</p> : null}
      {selectedFile ? <p className="mt-1 text-xs text-slate-600">Selected: {selectedFile.name}</p> : null}
      <FieldErrorText message={error} />
    </label>
  );
}

export function ReadonlyInput({ field, value }: { field: ResourceField; value: unknown }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-800">{field.label}</span>
      <input
        className="mt-2 min-h-11 w-full rounded-md border border-slate-200 bg-slate-100 px-3 text-sm text-slate-500"
        disabled
        value={value == null ? "" : String(value)}
      />
    </label>
  );
}
