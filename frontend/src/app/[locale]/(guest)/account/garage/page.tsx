import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import {
  getLookupItemsFromServer,
  getMyGarageFromServer,
  getVinDecodeStatusFromServer,
} from "@/lib/api/server";
import { GarageManager } from "@/components/account/GarageManager";
import { noindexMetadata } from "@/lib/seo";

export const metadata: Metadata = noindexMetadata({ follow: false });

export default async function GaragePage() {
  // The catalog/models the "add vehicle" form picks from aren't fetched
  // here — GarageManager loads them when the form is first opened.
  const [garage, fuelTypes, transmissionTypes, vinDecodeStatus] =
    await Promise.all([
      getMyGarageFromServer(),
      getLookupItemsFromServer("fuel-types"),
      getLookupItemsFromServer("transmission-types"),
      getVinDecodeStatusFromServer(),
    ]);

  return (
    <GaragePageView
      garage={garage}
      fuelTypes={fuelTypes}
      transmissionTypes={transmissionTypes}
      vinDecodeEnabled={vinDecodeStatus.enabled}
    />
  );
}

function GaragePageView({
  garage,
  fuelTypes,
  transmissionTypes,
  vinDecodeEnabled,
}: {
  garage: Awaited<ReturnType<typeof getMyGarageFromServer>>;
  fuelTypes: Awaited<ReturnType<typeof getLookupItemsFromServer>>;
  transmissionTypes: Awaited<ReturnType<typeof getLookupItemsFromServer>>;
  vinDecodeEnabled: boolean;
}) {
  const t = useTranslations("Account");

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{t("nav.garage")}</h1>
      <div className="mt-6">
        <GarageManager
          initialGarage={garage}
          fuelTypes={fuelTypes}
          transmissionTypes={transmissionTypes}
          vinDecodeEnabled={vinDecodeEnabled}
        />
      </div>
    </div>
  );
}
