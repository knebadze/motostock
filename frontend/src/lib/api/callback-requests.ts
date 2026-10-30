import { apiClient } from "./client";
import type { components } from "./generated/schema";

// "Call me back" requests (backend callback-requests module).
export type CallbackRequest = components["schemas"]["CallbackRequest"];

export async function createCallbackRequest(input: {
  vehicleListingId: number;
  name: string;
  phone: string;
  preferredTime?: string;
  note?: string;
}): Promise<void> {
  await apiClient.post("/callback-requests", input);
}

export async function listCallbackRequests(status?: "OPEN" | "RESOLVED"): Promise<CallbackRequest[]> {
  const { data } = await apiClient.get<{ requests: CallbackRequest[] }>("/callback-requests", { params: { status } });
  return data.requests;
}

export async function countOpenCallbackRequests(): Promise<number> {
  const { data } = await apiClient.get<{ count: number }>("/callback-requests/open-count");
  return data.count;
}

export async function resolveCallbackRequest(id: number, adminNote?: string): Promise<CallbackRequest> {
  const { data } = await apiClient.patch<{ request: CallbackRequest }>(`/callback-requests/${id}/resolve`, {
    adminNote: adminNote || undefined,
  });
  return data.request;
}

// wa.me needs the number as digits only, with the country code.
export function buildWhatsAppUrl(phone: string, text: string): string | null {
  let digits = phone.replace(/\D/g, "");
  if (digits.length === 9) digits = `995${digits}`; // local Georgian mobile
  if (digits.length < 10) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
