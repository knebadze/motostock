import { getAdminBrandsPageFromServer } from "@/lib/api/server";
import { BrandsManager } from "@/components/admin/brands/BrandsManager";

export default async function BrandsPage() {
  const initialData = await getAdminBrandsPageFromServer();

  return <BrandsManager initialData={initialData} />;
}
