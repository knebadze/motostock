import { apiClient } from "./client";

export type VinDecodeProvider = "nhtsa" | "vincario";

export type Settings = {
  useCloudStorage: boolean;
  vinDecodeEnabled: boolean;
  vinDecodeProvider: VinDecodeProvider;
  guestWishlistEnabled: boolean;
  guestCartEnabled: boolean;
  promoStackingEnabled: boolean;
  deliveryTbilisiPrice: number;
  deliveryTbilisiTime: string;
  deliveryRegionsPrice: number;
  deliveryRegionsTime: string;
  deliveryExpressPrice: number;
  deliveryExpressTime: string;
  fraudVelocityOrderCount: number;
  fraudVelocityWindowMinutes: number;
  fraudNewAccountWindowHours: number;
  fraudHighValueThreshold: number;
  fraudFailedLoginThreshold: number;
  fraudFailedLoginWindowMinutes: number;
  finaWebCustomerId: number | null;
  finaWebUserId: number | null;
};

export async function getSettings(): Promise<Settings> {
  const { data } = await apiClient.get<{ settings: Settings }>("/settings");
  return data.settings;
}

export async function updateSettings(input: Settings): Promise<Settings> {
  const { data } = await apiClient.patch<{ settings: Settings }>("/settings", input);
  return data.settings;
}
