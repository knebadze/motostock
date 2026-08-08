import { getCompanyInfoFromServer, getLookupItemsFromServer } from "@/lib/api/server";
import { CompanyInfoManager } from "@/components/admin/company-info/CompanyInfoManager";

export default async function CompanyInfoPage() {
  const [companyInfo, cities] = await Promise.all([
    getCompanyInfoFromServer(),
    getLookupItemsFromServer("cities"),
  ]);

  return <CompanyInfoManager initialCompanyInfo={companyInfo} cities={cities} />;
}
