"use client";

import { Carousel } from "@/components/shared/Carousel";
import { VehicleListingCard } from "@/components/shop/VehicleListingCard";
import type { VehicleListing } from "@/lib/api/vehicle-listings";

export function VehicleListingsCarouselSection({
  title,
  listings,
}: {
  title: string;
  listings: VehicleListing[];
}) {
  if (listings.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
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
