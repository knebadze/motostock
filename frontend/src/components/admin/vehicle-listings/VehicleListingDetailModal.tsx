"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Modal } from "@/components/shared/Modal";
import { Loader } from "@/components/shared/Loader";
import { Tabs } from "@/components/shared/Tabs";
import { SpecsList } from "@/components/shared/SpecsList";
import { sanitizeRichText } from "@/lib/sanitize-html";
import { formatDateTime, formatPrice } from "@/lib/format";
import { ApiRequestError, resolveMediaUrl } from "@/lib/api/client";
import {
  getVehicleListingDetailAdmin,
  type VehicleListingDetailAdmin,
} from "@/lib/api/vehicle-listings";

function Thumbnail({ url, alt }: { url: string | null; alt: string }) {
  const resolved = resolveMediaUrl(url);
  return (
    <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
      {resolved ? (
        <Image src={resolved} alt={alt} fill sizes="48px" className="object-cover" />
      ) : (
        <div className="size-full border border-dashed border-border" />
      )}
    </div>
  );
}

function boolLabel(value: boolean | null): string {
  return value == null ? "—" : value ? "კი" : "არა";
}

function warrantyLabel(listing: VehicleListingDetailAdmin): string {
  if (listing.warrantyValue == null || listing.warrantyUnit == null) return "—";
  const unit = listing.warrantyUnit === "YEAR" ? "წელი" : "თვე";
  return `${listing.warrantyValue} ${unit}`;
}

function MainTab({ listing }: { listing: VehicleListingDetailAdmin }) {
  const { vehicleCatalog: catalog } = listing;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <Thumbnail url={listing.images[0]?.imageUrl ?? catalog.imageUrl} alt="" />
        <div>
          <h3 className="text-lg font-semibold">
            {catalog.brand.name.ka} {catalog.model.name.ka}
            {catalog.variant ? ` (${catalog.variant})` : ""}
          </h3>
          <p className="text-sm text-muted-foreground">{catalog.category.name.ka}</p>
        </div>
      </div>

      <SpecsList
        rows={[
          { label: "წელი", value: String(listing.year) },
          { label: "გარბენი", value: listing.mileageKm != null ? `${listing.mileageKm} კმ` : "—" },
          { label: "გარანტია", value: warrantyLabel(listing) },
          { label: "მდგომარეობა", value: listing.condition.nameKa },
          { label: "ფერი", value: listing.color.nameKa },
          { label: "სტატუსი", value: listing.status.nameKa },
          {
            label: "ფასი",
            value: listing.activeDiscount
              ? `${formatPrice(listing.activeDiscount.discountPrice)} (იყო ${formatPrice(listing.price)})`
              : formatPrice(listing.price),
          },
          { label: "მარაგში", value: String(listing.stockQuantity) },
          { label: "აქტიური", value: boolLabel(listing.isActive) },
          { label: "დამატებულია", value: formatDateTime(listing.createdAt) },
          { label: "განახლებულია", value: formatDateTime(listing.updatedAt) },
        ]}
        showAllLabel="ყველას ნახვა"
        collapseLabel="აკეცვა"
      />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function StatsTab({ listing }: { listing: VehicleListingDetailAdmin }) {
  const { sales } = listing;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="ნახვები" value={String(listing.viewCount)} />
        <StatCard label="გაყიდულია (ცალი)" value={String(sales.totalQuantitySold)} />
        <StatCard label="შემოსავალი" value={formatPrice(sales.totalRevenue)} />
        <StatCard label="შეკვეთების რაოდენობა" value={String(sales.orderCount)} />
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          ბოლო შეკვეთები
        </p>
        {sales.recentOrders.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">ეს განცხადება ჯერ არავის უყიდია.</p>
        ) : (
          <div className="mt-2 overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">კოდი</th>
                  <th className="px-4 py-3 font-medium">მყიდველი</th>
                  <th className="px-4 py-3 font-medium">თარიღი</th>
                  <th className="px-4 py-3 font-medium">რაოდენობა</th>
                  <th className="px-4 py-3 font-medium">თანხა</th>
                  <th className="px-4 py-3 font-medium">სტატუსი</th>
                </tr>
              </thead>
              <tbody>
                {sales.recentOrders.map((order) => (
                  <tr key={`${order.orderId}-${order.quantity}`} className="border-b border-border last:border-0">
                    <td className="px-4 py-2 font-mono">{order.orderCode}</td>
                    <td className="px-4 py-2">
                      <p>{order.buyerName || "—"}</p>
                      <p className="text-xs text-muted-foreground">{order.buyerEmail}</p>
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{formatDateTime(order.createdAt)}</td>
                    <td className="px-4 py-2 text-muted-foreground">{order.quantity}</td>
                    <td className="px-4 py-2 font-semibold text-foreground">{formatPrice(order.lineTotal)}</td>
                    <td className="px-4 py-2 text-muted-foreground">{order.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SpecsTab({ listing }: { listing: VehicleListingDetailAdmin }) {
  const catalog = listing.vehicleCatalog;
  const isElectric = catalog.powertrainType?.key === "ELECTRIC";

  const rows = [
    { label: "მოდელის წლები", value: catalog.yearFrom || catalog.yearTo ? `${catalog.yearFrom ?? "?"}–${catalog.yearTo ?? "?"}` : "—" },
    { label: "ძრავის ტიპი", value: catalog.powertrainType?.nameKa ?? "—" },
    ...(isElectric
      ? [
          { label: "ძრავის სიმძლავრე (ვტ)", value: catalog.motorPowerWatt != null ? String(catalog.motorPowerWatt) : "—" },
          { label: "აკუმულატორი (Wh)", value: catalog.batteryCapacityWh != null ? String(catalog.batteryCapacityWh) : "—" },
          { label: "სავალი მანძილი (კმ)", value: catalog.rangeKm != null ? String(catalog.rangeKm) : "—" },
          { label: "დამუხტვის დრო (წთ)", value: catalog.chargingTimeMinutes != null ? String(catalog.chargingTimeMinutes) : "—" },
        ]
      : [
          { label: "მოცულობა (cc)", value: catalog.engineVolumeCc != null ? String(catalog.engineVolumeCc) : "—" },
          { label: "სიმძლავრე (ც.ძ)", value: catalog.enginePowerHp != null ? String(catalog.enginePowerHp) : "—" },
          { label: "ცილინდრები", value: catalog.cylinderCount != null ? String(catalog.cylinderCount) : "—" },
          { label: "გადაცემები", value: catalog.gearCount != null ? String(catalog.gearCount) : "—" },
          { label: "საწვავის ტიპი", value: catalog.fuelType?.nameKa ?? "—" },
          { label: "საწვავის ავზი (ლ)", value: catalog.fuelTankLiters != null ? String(catalog.fuelTankLiters) : "—" },
          { label: "გაშვების სისტემა", value: catalog.startType?.nameKa ?? "—" },
        ]),
    { label: "ადგილები", value: catalog.seatCount != null ? String(catalog.seatCount) : "—" },
    { label: "წონა (კგ)", value: catalog.weightKg != null ? String(catalog.weightKg) : "—" },
    { label: "სავარძლის სიმაღლე (მმ)", value: catalog.seatHeightMm != null ? String(catalog.seatHeightMm) : "—" },
    { label: "მაქს. სიჩქარე (კმ/სთ)", value: catalog.topSpeedKmh != null ? String(catalog.topSpeedKmh) : "—" },
    { label: "ABS", value: boolLabel(catalog.hasAbs) },
    { label: "გადაცემათა კოლოფი", value: catalog.transmissionType?.nameKa ?? "—" },
    { label: "გაგრილება", value: catalog.coolingType?.nameKa ?? "—" },
    { label: "საბოლოო გადაცემა", value: catalog.finalDriveType?.nameKa ?? "—" },
    { label: "წამყვანი თვლები", value: catalog.driveType?.nameKa ?? "—" },
    { label: "დიფერენციალის ბლოკირება", value: boolLabel(catalog.hasLockingDifferential) },
  ];

  return <SpecsList rows={rows} showAllLabel="ყველას ნახვა" collapseLabel="აკეცვა" />;
}

function DescriptionTab({ listing }: { listing: VehicleListingDetailAdmin }) {
  const sections: { label: string; html: string | null }[] = [
    { label: "ამ ერთეულის აღწერა (ka)", html: listing.descriptionKa },
    { label: "ამ ერთეულის აღწერა (en)", html: listing.descriptionEn },
    { label: "ამ ერთეულის აღწერა (ru)", html: listing.descriptionRu },
    { label: "მოდელის ზოგადი აღწერა (ka)", html: listing.vehicleCatalog.descriptionKa },
    { label: "მოდელის ზოგადი აღწერა (en)", html: listing.vehicleCatalog.descriptionEn },
    { label: "მოდელის ზოგადი აღწერა (ru)", html: listing.vehicleCatalog.descriptionRu },
  ];

  if (sections.every((section) => !section.html)) {
    return <p className="text-sm text-muted-foreground">აღწერა არ არის მითითებული.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {sections.map((section) =>
        section.html ? (
          <div key={section.label}>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {section.label}
            </p>
            <div
              className="mt-1.5 text-sm [&_a]:text-primary [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
              dangerouslySetInnerHTML={{ __html: sanitizeRichText(section.html) }}
            />
          </div>
        ) : null,
      )}
    </div>
  );
}

function ImagesTab({ listing }: { listing: VehicleListingDetailAdmin }) {
  if (listing.images.length === 0) {
    return <p className="text-sm text-muted-foreground">სურათი არ არის ატვირთული.</p>;
  }

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
      {listing.images.map((image) => {
        const resolved = resolveMediaUrl(image.imageUrl);
        return (
          <div key={image.id} className="relative aspect-square overflow-hidden rounded-lg bg-muted">
            {resolved && <Image src={resolved} alt="" fill sizes="150px" className="object-cover" />}
          </div>
        );
      })}
    </div>
  );
}

export function VehicleListingDetailModal({
  listingId,
  onClose,
}: {
  listingId: number;
  onClose: () => void;
}) {
  const [listing, setListing] = useState<VehicleListingDetailAdmin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    getVehicleListingDetailAdmin(listingId)
      .then((data) => {
        if (!cancelled) setListing(data);
      })
      .catch((error) => {
        if (cancelled) return;
        const message =
          error instanceof ApiRequestError ? error.message : "განცხადების ინფორმაციის ჩატვირთვა ვერ მოხერხდა";
        toast.error(message);
        onClose();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [listingId, onClose]);

  return (
    <Modal open onClose={onClose} title="განცხადების დეტალები" size="2xl">
      {loading || !listing ? (
        <div className="flex justify-center py-10">
          <Loader size="lg" />
        </div>
      ) : (
        <Tabs
          tabs={[
            { key: "main", label: "ძირითადი", content: <MainTab listing={listing} /> },
            { key: "stats", label: "სტატისტიკა", content: <StatsTab listing={listing} /> },
            { key: "specs", label: "სპეც-მონაცემები", content: <SpecsTab listing={listing} /> },
            { key: "description", label: "აღწერა", content: <DescriptionTab listing={listing} /> },
            { key: "images", label: `სურათები (${listing.images.length})`, content: <ImagesTab listing={listing} /> },
          ]}
        />
      )}
    </Modal>
  );
}
