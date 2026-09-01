"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { resolveApiErrorMessage } from "@/lib/api-errors";
import { AddressFormModal } from "./AddressFormModal";
import { deleteMyAddress, type Address } from "@/lib/api/addresses";
import type { LookupItem } from "@/lib/api/lookups";

export function AddressManager({
  initialAddresses,
  cities,
}: {
  initialAddresses: Address[];
  cities: LookupItem[];
}) {
  const locale = useLocale() as "ka" | "en" | "ru";
  const t = useTranslations("Account.address");
  const tCommon = useTranslations("Common");
  const tErrors = useTranslations("ApiErrors");
  const [addresses, setAddresses] = useState(initialAddresses);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deletingAddress, setDeletingAddress] = useState<Address | null>(null);

  const cityLabelKey = locale === "ka" ? "nameKa" : locale === "ru" ? "nameRu" : "nameEn";

  function openAddModal() {
    setEditingAddress(null);
    setModalOpen(true);
  }

  function openEditModal(address: Address) {
    setEditingAddress(address);
    setModalOpen(true);
  }

  async function handleDelete() {
    if (!deletingAddress) return;
    await deleteMyAddress(deletingAddress.id);
    setAddresses((current) => current.filter((item) => item.id !== deletingAddress.id));
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-muted-foreground">{t("description")}</p>
        <button
          type="button"
          onClick={openAddModal}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          {t("addButton")}
        </button>
      </div>

      {addresses.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {addresses.map((address) => (
            <div key={address.id} className="rounded-2xl border border-border bg-card p-6">
              <p className="font-semibold">{address.phone}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {address.city[cityLabelKey]}, {address.street}
                {address.building ? `, ${address.building}` : ""}
                {address.apartment ? `, ${t("apartmentLabel")} ${address.apartment}` : ""}
              </p>
              {address.postalCode && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("postalCodeLabel")}: {address.postalCode}
                </p>
              )}

              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => openEditModal(address)}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {t("editButton")}
                </button>
                <button
                  type="button"
                  onClick={() => setDeletingAddress(address)}
                  className="text-sm font-medium text-red-600 hover:underline"
                >
                  {t("deleteButton")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddressFormModal
        key={String(modalOpen)}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={(saved) => {
          setAddresses((current) => {
            const exists = current.some((item) => item.id === saved.id);
            return exists
              ? current.map((item) => (item.id === saved.id ? saved : item))
              : [saved, ...current];
          });
        }}
        initialAddress={editingAddress}
        cities={cities}
      />

      <ConfirmDialog
        open={deletingAddress !== null}
        onClose={() => setDeletingAddress(null)}
        title={t("deleteConfirmTitle")}
        message={t("deleteConfirmMessage")}
        confirmLabel={t("deleteButton")}
        successMessage={t("deleteSuccess")}
        onConfirm={handleDelete}
        cancelLabel={tCommon("confirmDialog.cancel")}
        processingLabel={tCommon("confirmDialog.processing")}
        errorFallback={tCommon("confirmDialog.genericError")}
        resolveErrorMessage={(error) =>
          resolveApiErrorMessage(error, tErrors, tCommon("confirmDialog.genericError"))
        }
        closeLabel={tCommon("modal.close")}
        loaderLabel={tCommon("loader.loading")}
      />
    </div>
  );
}
