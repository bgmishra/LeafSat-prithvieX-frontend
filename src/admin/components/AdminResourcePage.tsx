"use client";

import { useMemo, useState } from "react";
import type { ResourceConfig } from "@/admin/types/resources";
import { AdminApiError } from "@/admin/hooks/useApiClient";
import { useAuthUser } from "@/admin/hooks/useAuthUser";
import { useCrudResource } from "@/admin/hooks/useCrudResource";
import { BulkUploadDialog } from "./BulkUploadDialog";
import { ConfirmDeleteDialog } from "./ConfirmDeleteDialog";
import { DataTable } from "./DataTable";
import { EntityFormDialog } from "./EntityFormDialog";
import { GeometryPreviewDialog } from "./GeometryPreviewDialog";
import { useToast } from "./ToastProvider";

function itemId(config: ResourceConfig, item: Record<string, unknown>) {
  return item[config.idKey || "id"] as string | number | undefined;
}

function getOwnerId(item: Record<string, unknown>) {
  const user = item.user;

  if (user && typeof user === "object") {
    return (user as Record<string, unknown>).id;
  }

  return user;
}

function isOwnItem(item: Record<string, unknown>, userId: string | number | undefined) {
  if (userId === undefined) {
    return false;
  }

  return String(getOwnerId(item)) === String(userId);
}

function permissionError() {
  return "You do not have permission to perform this action.";
}

export function AdminResourcePage({ config }: { config: ResourceConfig }) {
  const auth = useAuthUser();
  const effectiveConfig = useMemo(() => {
    if (config.key !== "balances" || auth.isAdmin) {
      return config;
    }

    return {
      ...config,
      fields: config.fields.filter((field) => field.name !== "user"),
    };
  }, [auth.isAdmin, config]);
  const crud = useCrudResource(effectiveConfig);
  const toast = useToast();
  const [editingItem, setEditingItem] = useState<Record<string, unknown> | null>(null);
  const [deletingItem, setDeletingItem] = useState<Record<string, unknown> | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [viewingItem, setViewingItem] = useState<Record<string, unknown> | null>(null);

  const visibleItems = useMemo(() => {
    if (!effectiveConfig.normalUserOwnResourceOnly || auth.isAdmin) {
      return crud.items;
    }

    return crud.items.filter((item) => isOwnItem(item, auth.user?.id));
  }, [auth.isAdmin, auth.user?.id, crud.items, effectiveConfig.normalUserOwnResourceOnly]);

  const canCreate = auth.isAdmin || Boolean(effectiveConfig.canNormalUserMutate);
  const canMutateCatalog = auth.isAdmin || Boolean(effectiveConfig.canNormalUserMutate);

  function canEdit(item: Record<string, unknown>) {
    if (!canMutateCatalog) {
      return false;
    }

    if (effectiveConfig.normalUserOwnResourceOnly && !auth.isAdmin) {
      return isOwnItem(item, auth.user?.id);
    }

    return true;
  }

  function canDelete(item: Record<string, unknown>) {
    if (!auth.isAdmin) {
      return false;
    }

    return Boolean(itemId(effectiveConfig, item));
  }

  function canView() {
    return Boolean(effectiveConfig.geometryPreview);
  }

  function openCreate() {
    setEditingItem(null);
    setFormOpen(true);
  }

  function openEdit(item: Record<string, unknown>) {
    setEditingItem(item);
    setFormOpen(true);
  }

  async function createItem(values: Record<string, unknown>) {
    const payload = { ...values };

    if (effectiveConfig.key === "balances" && !auth.isAdmin) {
      delete payload.user;
    }

    await crud.createItem(payload);
    toast.notify({ title: `${effectiveConfig.title} created successfully.`, type: "success" });
  }

  async function updateItem(id: string | number, values: Record<string, unknown>) {
    const payload = { ...values };

    if (effectiveConfig.key === "balances" && !auth.isAdmin) {
      delete payload.user;
    }

    await crud.updateItem(id, payload);
    toast.notify({ title: `${effectiveConfig.title} updated successfully.`, type: "success" });
  }

  async function confirmDelete() {
    if (!deletingItem) {
      return;
    }

    const id = itemId(effectiveConfig, deletingItem);

    if (id === undefined) {
      toast.notify({ title: "Unable to delete this record because it has no id.", type: "error" });
      return;
    }

    try {
      await crud.deleteItem(id);
      toast.notify({ title: `${effectiveConfig.title} deleted successfully.`, type: "success" });
      setDeletingItem(null);
    } catch (caught) {
      const title = caught instanceof AdminApiError && caught.status === 403 ? permissionError() : String(caught);
      toast.notify({ title, type: "error" });
    }
  }

  const accessWarning = !auth.loading && !auth.isAdmin && !effectiveConfig.canNormalUserMutate;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">PrithviEx Admin</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{effectiveConfig.title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{effectiveConfig.description}</p>
        </div>
        {canCreate ? (
          <div className="flex flex-wrap gap-3">
            {effectiveConfig.bulkUpload ? (
              <button
                className="inline-flex min-h-11 items-center justify-center rounded-md border border-teal-700 px-4 text-sm font-semibold text-teal-700 transition hover:bg-teal-50 disabled:opacity-60"
                disabled={auth.loading}
                onClick={() => setBulkUploadOpen(true)}
                type="button"
              >
                {effectiveConfig.bulkUpload.label || `Bulk Upload ${effectiveConfig.title}`}
              </button>
            ) : null}
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-teal-700 px-4 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
              disabled={auth.loading}
              onClick={openCreate}
              type="button"
            >
              Create {effectiveConfig.title}
            </button>
          </div>
        ) : null}
      </div>

      {auth.error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{auth.error}</div>
      ) : null}
      {crud.error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{crud.error}</div>
      ) : null}
      {accessWarning ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          You can view this catalog, but only admin and superadmin users can make changes.
        </div>
      ) : null}

      <DataTable
        canDelete={canDelete}
        canEdit={canEdit}
        canView={canView}
        config={effectiveConfig}
        items={visibleItems}
        loading={auth.loading || crud.loading}
        onDelete={setDeletingItem}
        onEdit={openEdit}
        onView={setViewingItem}
      />

      <EntityFormDialog
        config={effectiveConfig}
        item={editingItem}
        onClose={() => setFormOpen(false)}
        onCreate={createItem}
        onUpdate={updateItem}
        open={formOpen}
        options={crud.options}
      />

      <ConfirmDeleteDialog
        label={effectiveConfig.title.toLowerCase()}
        loading={crud.saving}
        onClose={() => setDeletingItem(null)}
        onConfirm={confirmDelete}
        open={Boolean(deletingItem)}
      />

      <BulkUploadDialog
        config={effectiveConfig}
        onClose={() => setBulkUploadOpen(false)}
        onUploaded={() => void crud.loadItems()}
        open={bulkUploadOpen}
        options={crud.options}
      />

      <GeometryPreviewDialog
        config={effectiveConfig}
        item={viewingItem}
        onClose={() => setViewingItem(null)}
        open={Boolean(viewingItem)}
      />
    </div>
  );
}
