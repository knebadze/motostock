import { apiClient } from "./client";
import type { LookupItem } from "./lookups";

export type WeekDay =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export type CompanyWorkingHour = {
  dayOfWeek: WeekDay;
  isClosed: boolean;
  openTime: string | null;
  closeTime: string | null;
};

export type CompanyInfo = {
  id: number;
  name: string;
  logoUrl: string | null;
  city: LookupItem | null;
  street: string | null;
  phone: string | null;
  email: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  youtubeUrl: string | null;
  tiktokUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  workingHours: CompanyWorkingHour[];
  updatedAt: string;
};

export type UpdateCompanyInfoInput = {
  name: string;
  cityId?: number | null;
  street?: string | null;
  phone?: string | null;
  email?: string | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  youtubeUrl?: string | null;
  tiktokUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  workingHours?: CompanyWorkingHour[];
};

export async function getCompanyInfo(): Promise<CompanyInfo> {
  const { data } = await apiClient.get<{ companyInfo: CompanyInfo }>("/company-info");
  return data.companyInfo;
}

export async function updateCompanyInfo(input: UpdateCompanyInfoInput): Promise<CompanyInfo> {
  const { data } = await apiClient.patch<{ companyInfo: CompanyInfo }>("/company-info", input);
  return data.companyInfo;
}

export async function uploadCompanyLogo(file: File): Promise<CompanyInfo> {
  const formData = new FormData();
  formData.append("logo", file);

  const { data } = await apiClient.post<{ companyInfo: CompanyInfo }>(
    "/company-info/logo",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data.companyInfo;
}
