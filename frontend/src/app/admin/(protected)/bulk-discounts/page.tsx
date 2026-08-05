import { getCategoriesFromServer } from "@/lib/api/server";
import { BulkDiscountsTabs } from "@/components/admin/bulk-discounts/BulkDiscountsTabs";

export default async function BulkDiscountsPage() {
  const categories = await getCategoriesFromServer();

  return <BulkDiscountsTabs categories={categories} />;
}
