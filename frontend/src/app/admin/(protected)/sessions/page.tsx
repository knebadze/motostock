import { getSessionsFromServer } from "@/lib/api/server";
import { SessionsManager } from "@/components/admin/sessions/SessionsManager";

export default async function SessionsPage() {
  const initialData = await getSessionsFromServer();
  return <SessionsManager initialData={initialData} />;
}
