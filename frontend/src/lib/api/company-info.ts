import { apiClient } from "./client";
import type { components } from "./generated/schema";

// Response/input shapes below aliasing `Schemas[...]` are generated from the
// backend's OpenAPI document (npm run api:types → generated/schema.d.ts).
type Schemas = components["schemas"];

export type WeekDay =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export type CompanyWorkingHour = Schemas["CompanyWorkingHour"];

export type CompanyInfo = Schemas["CompanyInfo"];

export type UpdateCompanyInfoInput = Schemas["UpdateCompanyInfoInput"];

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
