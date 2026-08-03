import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getLookupItemsFromServer, getMyAddressFromServer } from "@/lib/api/server";
import { AddressForm } from "@/components/account/AddressForm";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AddressPage() {
  const [address, cities] = await Promise.all([
    getMyAddressFromServer(),
    getLookupItemsFromServer("cities"),
  ]);

  return <AddressPageView address={address} cities={cities} />;
}

function AddressPageView({
  address,
  cities,
}: {
  address: Awaited<ReturnType<typeof getMyAddressFromServer>>;
  cities: Awaited<ReturnType<typeof getLookupItemsFromServer>>;
}) {
  const t = useTranslations("Account");

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{t("nav.address")}</h1>
      <p className="mt-2 text-muted-foreground">{t("address.description")}</p>
      <div className="mt-6">
        <AddressForm initialAddress={address} cities={cities} />
      </div>
    </div>
  );
}
