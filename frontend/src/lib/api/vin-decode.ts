import { apiClient } from "./client";

export type VinDecodeResult = {
  year: number | null;
  engineVolumeCc: number | null;
  enginePowerHp: number | null;
};

export async function decodeVin(vin: string): Promise<VinDecodeResult> {
  const { data } = await apiClient.post<{ result: VinDecodeResult }>("/vin-decode", { vin });
  return data.result;
}
