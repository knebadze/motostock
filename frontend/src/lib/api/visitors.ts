import { apiClient } from "./client";

export type VisitorOverview = {
  activeNow: number;
  todayVisitors: number;
  weekVisitors: number;
  dailySeries: { date: string; visitors: number }[];
};

// Public, no auth — fire-and-forget heartbeat (see VisitorPingBeacon.tsx),
// works for both logged-in users and guests via the shared guest-id cookie.
export async function pingVisitor(): Promise<void> {
  await apiClient.post("/visitors/ping");
}

export async function getVisitorOverview(): Promise<VisitorOverview> {
  const { data } = await apiClient.get<VisitorOverview>("/visitors/overview");
  return data;
}
