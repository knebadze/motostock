import type { OrderDeliverySpeed, OrderFulfillmentMethod, OrderRiskFlagType } from "@/lib/api/orders";

// Single source for these three order-related enum -> label mappings —
// FULFILLMENT_LABELS used to be hand-copied verbatim in both
// OrdersManager.tsx (the list) and OrderDetailModal.tsx (the detail view);
// RISK_FLAG_LABELS/DELIVERY_SPEED_LABELS only ever lived in the detail
// modal, moved here alongside it since they're the same "order enum needs a
// Georgian label" shape.
export const FULFILLMENT_LABELS: Record<OrderFulfillmentMethod, string> = {
  CARD: "ბარათით გადახდა",
  COURIER: "კურიერთან გადახდა",
  PICKUP: "ადგილიდან გატანა",
};

export const FULFILLMENT_OPTIONS = (Object.keys(FULFILLMENT_LABELS) as OrderFulfillmentMethod[]).map(
  (value) => ({ value, label: FULFILLMENT_LABELS[value] }),
);

export const RISK_FLAG_LABELS: Record<OrderRiskFlagType, string> = {
  NEW_ACCOUNT_HIGH_VALUE: "ახალი ანგარიში + მაღალი თანხა",
  ORDER_VELOCITY: "შეკვეთების სიხშირე",
  PROMO_CODE_MULTI_ACCOUNT: "პრომოკოდი — მრავალი ანგარიში",
  SHARED_IP_MULTIPLE_ACCOUNTS: "საერთო IP რამდენიმე ანგარიშთან",
};

export const DELIVERY_SPEED_LABELS: Record<OrderDeliverySpeed, string> = {
  STANDARD: "სტანდარტული მიტანა",
  EXPRESS: "სწრაფი მიტანა (ექსპრესი)",
};
