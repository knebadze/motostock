import { getSettingsFromServer } from "@/lib/api/server";
import { SettingsManager } from "@/components/admin/settings/SettingsManager";

export default async function SettingsPage() {
  const settings = await getSettingsFromServer();

  return <SettingsManager initialSettings={settings} />;
}
