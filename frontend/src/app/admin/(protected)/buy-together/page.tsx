import { getCategoriesFromServer, getProductBuyTogetherFromServer } from "@/lib/api/server";
import { BuyTogetherManager } from "@/components/admin/buy-together/BuyTogetherManager";

export default async function BuyTogetherPage() {
  const [items, categories] = await Promise.all([
    getProductBuyTogetherFromServer(),
    getCategoriesFromServer(),
  ]);

  return <BuyTogetherManager initialItems={items} categories={categories} />;
}
