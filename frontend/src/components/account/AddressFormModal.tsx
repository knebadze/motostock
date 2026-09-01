"use client";

import { useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Modal } from "@/components/shared/Modal";
import { Select } from "@/components/shared/Select";
import { FieldError } from "@/components/shared/FieldError";
import { FormActions } from "@/components/shared/FormActions";
import { createMyAddress, updateMyAddress, type Address } from "@/lib/api/addresses";
import type { LookupItem } from "@/lib/api/lookups";
import { resolveApiErrorMessage } from "@/lib/api-errors";
import { createAddressFormSchema } from "@/lib/validation/address";
import { getFieldErrors, type FieldErrors } from "@/lib/validation/common";

export function AddressFormModal({
  open,
  onClose,
  onSaved,
  initialAddress,
  cities,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (address: Address) => void;
  initialAddress: Address | null;
  cities: LookupItem[];
}) {
  const locale = useLocale() as "ka" | "en" | "ru";
  const t = useTranslations("Account.address");
  const tCommon = useTranslations("Common");
  const tErrors = useTranslations("ApiErrors");
  const isEditing = initialAddress !== null;
  const [phone, setPhone] = useState(initialAddress?.phone ?? "");
  const [cityId, setCityId] = useState(initialAddress ? String(initialAddress.city.id) : "");
  const [street, setStreet] = useState(initialAddress?.street ?? "");
  const [building, setBuilding] = useState(initialAddress?.building ?? "");
  const [apartment, setApartment] = useState(initialAddress?.apartment ?? "");
  const [postalCode, setPostalCode] = useState(initialAddress?.postalCode ?? "");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);

  const cityLabelKey = locale === "ka" ? "nameKa" : locale === "ru" ? "nameRu" : "nameEn";
  const cityOptions = cities.map((city) => ({ value: String(city.id), label: city[cityLabelKey] }));

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const schema = createAddressFormSchema(t);
    const result = schema.safeParse({ phone, cityId, street, building, apartment, postalCode });
    if (!result.success) {
      setErrors(getFieldErrors(result.error));
      return;
    }
    setErrors({});

    setLoading(true);
    try {
      const payload = {
        phone: result.data.phone,
        cityId: Number(result.data.cityId),
        street: result.data.street,
        building: result.data.building || null,
        apartment: result.data.apartment || null,
        postalCode: result.data.postalCode || null,
      };
      const saved = isEditing
        ? await updateMyAddress(initialAddress.id, payload)
        : await createMyAddress(payload);
      toast.success(t("success"));
      onSaved(saved);
      onClose();
    } catch (error) {
      toast.error(resolveApiErrorMessage(error, tErrors, t("error")));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? t("modalEditTitle") : t("modalAddTitle")}
      closeLabel={tCommon("modal.close")}
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="address-phone" className="text-sm font-medium">
            {t("phoneLabel")}
          </label>
          <input
            id="address-phone"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <FieldError message={errors.phone} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="address-city" className="text-sm font-medium">
            {t("cityLabel")}
          </label>
          <Select
            id="address-city"
            options={cityOptions}
            value={cityId}
            onChange={setCityId}
            searchable
            placeholder={t("cityPlaceholder")}
            searchPlaceholder={tCommon("select.search")}
            emptyLabel={tCommon("select.empty")}
          />
          <FieldError message={errors.cityId} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="address-street" className="text-sm font-medium">
            {t("streetLabel")}
          </label>
          <input
            id="address-street"
            type="text"
            autoComplete="address-line1"
            value={street}
            onChange={(event) => setStreet(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <FieldError message={errors.street} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="address-building" className="text-sm font-medium">
              {t("buildingLabel")}
            </label>
            <input
              id="address-building"
              type="text"
              value={building}
              onChange={(event) => setBuilding(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <FieldError message={errors.building} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="address-apartment" className="text-sm font-medium">
              {t("apartmentLabel")}
            </label>
            <input
              id="address-apartment"
              type="text"
              value={apartment}
              onChange={(event) => setApartment(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <FieldError message={errors.apartment} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="address-postal-code" className="text-sm font-medium">
            {t("postalCodeLabel")}
          </label>
          <input
            id="address-postal-code"
            type="text"
            autoComplete="postal-code"
            value={postalCode}
            onChange={(event) => setPostalCode(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <FieldError message={errors.postalCode} />
        </div>

        <FormActions
          onCancel={onClose}
          loading={loading}
          submitLabel={t("submit")}
          loadingLabel={t("submitting")}
          cancelLabel={tCommon("formActions.cancel")}
        />
      </form>
    </Modal>
  );
}
