import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getLookupItemsFromServer, getMyAddressesFromServer } from "@/lib/api/server";
import { AddressManager } from "@/components/account/AddressManager";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AddressPage() {
  const [addresses, cities] = await Promise.all([
    getMyAddressesFromServer(),
    getLookupItemsFromServer("cities"),
  ]);

  return <AddressPageView addresses={addresses} cities={cities} />;
}

function AddressPageView({
  addresses,
  cities,
}: {
  addresses: Awaited<ReturnType<typeof getMyAddressesFromServer>>;
  cities: Awaited<ReturnType<typeof getLookupItemsFromServer>>;
}) {
  const t = useTranslations("Account");

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{t("nav.address")}</h1>
      <div className="mt-6">
        <AddressManager initialAddresses={addresses} cities={cities} />
      </div>
    </div>
  );
}
