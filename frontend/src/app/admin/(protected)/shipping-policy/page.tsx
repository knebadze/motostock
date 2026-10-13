import { getShippingPolicyFromServer } from "@/lib/api/server";
import { ShippingPolicyManager } from "@/components/admin/shipping-policy/ShippingPolicyManager";

export default async function ShippingPolicyPage() {
  const shippingPolicy = await getShippingPolicyFromServer();

  return <ShippingPolicyManager initialShippingPolicy={shippingPolicy} />;
}
