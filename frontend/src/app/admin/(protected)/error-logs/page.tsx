import { getErrorLogsFromServer } from "@/lib/api/server";
import { ErrorLogsManager } from "@/components/admin/error-logs/ErrorLogsManager";

export default async function ErrorLogsPage() {
  const initialData = await getErrorLogsFromServer();

  return <ErrorLogsManager initialData={initialData} />;
}
