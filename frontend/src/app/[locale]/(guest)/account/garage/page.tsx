import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import {
  getLookupItemsFromServer,
  getModelsFromServer,
  getMyGarageFromServer,
  getVehicleCatalogFromServer,
  getVinDecodeStatusFromServer,
} from "@/lib/api/server";
import { GarageManager } from "@/components/account/GarageManager";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function GaragePage() {
  const [garage, vehicleCatalog, models, fuelTypes, transmissionTypes, vinDecodeStatus] =
    await Promise.all([
      getMyGarageFromServer(),
      getVehicleCatalogFromServer(),
      getModelsFromServer(),
      getLookupItemsFromServer("fuel-types"),
      getLookupItemsFromServer("transmission-types"),
      getVinDecodeStatusFromServer(),
    ]);

  return (
    <GaragePageView
      garage={garage}
      vehicleCatalog={vehicleCatalog}
      models={models}
      fuelTypes={fuelTypes}
      transmissionTypes={transmissionTypes}
      vinDecodeEnabled={vinDecodeStatus.enabled}
    />
  );
}

function GaragePageView({
  garage,
  vehicleCatalog,
  models,
  fuelTypes,
  transmissionTypes,
  vinDecodeEnabled,
}: {
  garage: Awaited<ReturnType<typeof getMyGarageFromServer>>;
  vehicleCatalog: Awaited<ReturnType<typeof getVehicleCatalogFromServer>>;
  models: Awaited<ReturnType<typeof getModelsFromServer>>;
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
          vehicleCatalog={vehicleCatalog}
          models={models}
          fuelTypes={fuelTypes}
          transmissionTypes={transmissionTypes}
          vinDecodeEnabled={vinDecodeEnabled}
        />
      </div>
    </div>
  );
}
