"use client";

import { useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Select } from "@/components/shared/Select";
import { FieldError } from "@/components/shared/FieldError";
import { saveMyAddress, type Address } from "@/lib/api/addresses";
import type { LookupItem } from "@/lib/api/lookups";
import { ApiRequestError } from "@/lib/api/client";
import { createAddressFormSchema } from "@/lib/validation/address";
import { getFieldErrors, type FieldErrors } from "@/lib/validation/common";

export function AddressForm({
  initialAddress,
  cities,
}: {
  initialAddress: Address | null;
  cities: LookupItem[];
}) {
  const locale = useLocale() as "ka" | "en" | "ru";
  const t = useTranslations("Account.address");
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
      await saveMyAddress({
        phone: result.data.phone,
        cityId: Number(result.data.cityId),
        street: result.data.street,
        building: result.data.building || null,
        apartment: result.data.apartment || null,
        postalCode: result.data.postalCode || null,
      });
      toast.success(t("success"));
    } catch (error) {
      const message = error instanceof ApiRequestError ? error.message : t("error");
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex max-w-lg flex-col gap-4 rounded-2xl border border-border bg-card p-6"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="phone" className="text-sm font-medium">
          {t("phoneLabel")}
        </label>
        <input
          id="phone"
          type="tel"
          autoComplete="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <FieldError message={errors.phone} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">{t("cityLabel")}</label>
        <Select
          options={cityOptions}
          value={cityId}
          onChange={setCityId}
          searchable
          placeholder={t("cityPlaceholder")}
        />
        <FieldError message={errors.cityId} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="street" className="text-sm font-medium">
          {t("streetLabel")}
        </label>
        <input
          id="street"
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
          <label htmlFor="building" className="text-sm font-medium">
            {t("buildingLabel")}
          </label>
          <input
            id="building"
            type="text"
            value={building}
            onChange={(event) => setBuilding(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <FieldError message={errors.building} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="apartment" className="text-sm font-medium">
            {t("apartmentLabel")}
          </label>
          <input
            id="apartment"
            type="text"
            value={apartment}
            onChange={(event) => setApartment(event.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <FieldError message={errors.apartment} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="postal-code" className="text-sm font-medium">
          {t("postalCodeLabel")}
        </label>
        <input
          id="postal-code"
          type="text"
          autoComplete="postal-code"
          value={postalCode}
          onChange={(event) => setPostalCode(event.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <FieldError message={errors.postalCode} />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
      >
        {loading ? t("submitting") : t("submit")}
      </button>
    </form>
  );
}
