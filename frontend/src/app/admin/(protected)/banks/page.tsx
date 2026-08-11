import { getBanksFromServer } from "@/lib/api/server";
import { BanksManager } from "@/components/admin/banks/BanksManager";

export default async function BanksPage() {
  const banks = await getBanksFromServer();

  return <BanksManager initialBanks={banks} />;
}
