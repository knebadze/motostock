import { getBrandsFromServer } from "@/lib/api/server";
import { BrandsManager } from "@/components/admin/brands/BrandsManager";

export default async function BrandsPage() {
  const brands = await getBrandsFromServer();

  return <BrandsManager initialBrands={brands} />;
}
