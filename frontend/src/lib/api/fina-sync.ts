import { apiClient } from "./client";

export type FinaSyncRun = {
  id: number;
  trigger: "SCHEDULED" | "MANUAL";
  status: "SUCCESS" | "FAILED" | "PARTIAL";
  startedAt: string;
  finishedAt: string | null;
  variantsChecked: number;
  variantsUpdated: number;
  errorMessage: string | null;
  triggeredBy: { id: number; name: string } | null;
};

export async function getFinaSyncRuns(): Promise<FinaSyncRun[]> {
  const { data } = await apiClient.get<{ runs: FinaSyncRun[] }>("/fina-sync/runs");
  return data.runs;
}

export async function triggerFinaSync(): Promise<FinaSyncRun> {
  const { data } = await apiClient.post<{ run: FinaSyncRun }>("/fina-sync/run");
  return data.run;
}
