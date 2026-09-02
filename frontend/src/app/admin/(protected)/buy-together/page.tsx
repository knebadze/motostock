import { getCategoriesFromServer, getProductBuyTogetherFromServer } from "@/lib/api/server";
import { BuyTogetherManager } from "@/components/admin/buy-together/BuyTogetherManager";

export default async function BuyTogetherPage() {
  const [initialData, categories] = await Promise.all([
    getProductBuyTogetherFromServer(),
    getCategoriesFromServer(),
  ]);

  return <BuyTogetherManager initialData={initialData} categories={categories} />;
}
