import { getFinaSyncRunsFromServer } from "@/lib/api/server";
import { FinaSyncManager } from "@/components/admin/fina-sync/FinaSyncManager";

export default async function FinaSyncPage() {
  const runs = await getFinaSyncRunsFromServer();

  return <FinaSyncManager initialRuns={runs} />;
}
