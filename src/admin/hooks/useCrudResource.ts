"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ResourceConfig, SelectOption } from "@/admin/types/resources";
import { AdminApiError, useApiClient } from "./useApiClient";

type CrudItem = Record<string, unknown>;

function unwrapList(data: unknown): CrudItem[] {
  if (Array.isArray(data)) {
    return data as CrudItem[];
  }

  if (data && typeof data === "object" && Array.isArray((data as { results?: unknown }).results)) {
    return (data as { results: CrudItem[] }).results;
  }

  return [];
}

function optionFromItem(item: CrudItem, labelKey = "name_label", valueKey = "id"): SelectOption {
  const label =
    item[labelKey] ??
    item.name_label ??
    item.name ??
    item.source_name_label ??
    item.source_name ??
    item.atmos_press_level_label ??
    item.atmos_press_level ??
    item.model_name_label ??
    item.model_name ??
    item.scenario_name_label ??
    item.scenario_name ??
    item.temporal_type_label ??
    item.temporal_type ??
    item.email ??
    item.full_name ??
    item.id;
  const value = item[valueKey] ?? item.id;

  return {
    label: String(label ?? ""),
    value: String(value ?? ""),
  };
}

export function useCrudResource(config: ResourceConfig) {
  const { request } = useApiClient();
  const [items, setItems] = useState<CrudItem[]>([]);
  const [options, setOptions] = useState<Record<string, SelectOption[]>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const optionFields = useMemo(
    () => config.fields.filter((field) => field.optionSource),
    [config.fields],
  );

  const loadOptions = useCallback(async () => {
    const nextOptions: Record<string, SelectOption[]> = {};

    await Promise.all(
      optionFields.map(async (field) => {
        if (!field.optionSource) {
          return;
        }

        const data = await request<unknown>(field.optionSource.endpoint);
        nextOptions[field.name] = unwrapList(data).map((item) =>
          optionFromItem(item, field.optionSource?.labelKey, field.optionSource?.valueKey),
        );
      }),
    );

    setOptions(nextOptions);
  }, [optionFields, request]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await request<unknown>(config.endpoint);
      setItems(unwrapList(data));
    } catch (caught) {
      if (caught instanceof AdminApiError && caught.status !== 401) {
        setError(caught.message);
      }
    } finally {
      setLoading(false);
    }
  }, [config.endpoint, request]);

  useEffect(() => {
    void Promise.resolve().then(async () => {
      await loadItems();

      try {
        await loadOptions();
      } catch (caught) {
        if (caught instanceof AdminApiError && caught.status !== 401) {
          setError(caught.message);
        }
      }
    });
  }, [loadItems, loadOptions]);

  async function createItem(values: CrudItem) {
    setSaving(true);
    try {
      await request(config.endpoint, {
        method: "POST",
        body: JSON.stringify(values),
      });
      await loadItems();
    } finally {
      setSaving(false);
    }
  }

  async function updateItem(id: string | number, values: CrudItem) {
    setSaving(true);
    try {
      await request(`${config.endpoint}${id}/`, {
        method: "PATCH",
        body: JSON.stringify(values),
      });
      await loadItems();
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem(id: string | number) {
    setSaving(true);
    try {
      await request(`${config.endpoint}${id}/`, {
        method: "DELETE",
      });
      await loadItems();
    } finally {
      setSaving(false);
    }
  }

  return {
    createItem,
    deleteItem,
    error,
    items,
    loadItems,
    loading,
    options,
    saving,
    updateItem,
  };
}
