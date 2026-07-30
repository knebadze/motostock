"use client";

import { useTranslations } from "next-intl";
import { Carousel } from "@/components/shared/Carousel";
import { VehicleListingCard } from "../VehicleListingCard";
import type { VehicleListing } from "@/lib/api/vehicle-listings";

export function SimilarVehicleListings({ listings }: { listings: VehicleListing[] }) {
  const t = useTranslations("VehicleListingDetail");

  if (listings.length === 0) return null;

  return (
    <section className="mt-14 border-t border-border pt-8">
      <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
        {t("similarHeading")}
      </h2>
      <div className="mt-6">
        <Carousel
          items={listings}
          getKey={(listing) => listing.id}
          renderItem={(listing) => <VehicleListingCard listing={listing} layout="grid" />}
        />
      </div>
    </section>
  );
}
