import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatPrice } from "@/lib/format";
import type { PublicDeliveryInfo } from "@/lib/api/settings";

const iconClassName = "mt-0.5 size-5 shrink-0 text-primary-text";

function TruckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClassName} aria-hidden>
      <path d="M3 6h11v10H3zM14 9h4l3 3v4h-7" strokeLinejoin="round" />
      <circle cx="7" cy="17.5" r="1.8" />
      <circle cx="17.5" cy="17.5" r="1.8" />
    </svg>
  );
}

function StoreIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClassName} aria-hidden>
      <path d="M4 9.5 5.5 4h13L20 9.5M4 9.5h16M4 9.5V20h16V9.5M9.5 20v-5h5v5" strokeLinejoin="round" />
    </svg>
  );
}

function ReturnIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={iconClassName} aria-hidden>
      <path d="M9 7 4 12l5 5M4 12h11a5 5 0 0 1 0 10h-2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Product page "delivery / pickup / returns" summary under add-to-cart —
// prices and times from Settings → delivery (public /settings/delivery-info),
// pickup address from CompanyInfo. The return line is hidden when the admin
// set the return window to 0. Rendered on the server and passed into the
// (client) ProductDetailPage as a slot.
export function DeliveryInfoBlock({ info, pickupAddress }: { info: PublicDeliveryInfo; pickupAddress: string | null }) {
  const t = useTranslations("ProductDetail");

  const priceLabel = (price: number) => (price > 0 ? formatPrice(price) : t("deliveryFree"));
  const options = [
    { label: t("deliveryTbilisi"), ...info.tbilisi },
    { label: t("deliveryRegions"), ...info.regions },
    { label: t("deliveryExpress"), ...info.express },
  ].filter((option) => option.price > 0 || option.time.trim() !== "");

  return (
    <div className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-card text-sm">
      {options.length > 0 && (
        <div className="flex gap-3 p-4">
          <TruckIcon />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground">{t("deliveryHeading")}</p>
            <ul className="mt-1 flex flex-col gap-0.5 text-muted-foreground">
              {options.map((option) => (
                <li key={option.label}>
                  {option.label} — <span className="font-medium text-foreground">{priceLabel(option.price)}</span>
                  {option.time.trim() && ` · ${option.time.trim()}`}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      <div className="flex gap-3 p-4">
        <StoreIcon />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">{t("pickupHeading")}</p>
          {pickupAddress && <p className="mt-1 text-muted-foreground">{pickupAddress}</p>}
        </div>
      </div>
      {info.returnPeriodDays > 0 && (
        <div className="flex gap-3 p-4">
          <ReturnIcon />
          <p className="min-w-0 flex-1 font-semibold text-foreground">
            {t("returnsLine", { days: info.returnPeriodDays })}
          </p>
        </div>
      )}
      <div className="px-4 py-3">
        <Link href="/shipping" className="text-sm font-medium text-primary-text hover:underline">
          {t("deliveryDetailsLink")}
        </Link>
      </div>
    </div>
  );
}
