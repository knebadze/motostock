import type {
  OrderDeliveryMethod,
  OrderDeliverySpeed,
  OrderPaymentMethod,
  OrderRiskFlagType,
} from "@/lib/api/orders";

// Single source for these three order-related enum -> label mappings —
// DELIVERY/PAYMENT labels used to be hand-copied verbatim in both
// OrdersManager.tsx (the list) and OrderDetailModal.tsx (the detail view);
// RISK_FLAG_LABELS/DELIVERY_SPEED_LABELS only ever lived in the detail
// modal, moved here alongside it since they're the same "order enum needs a
// Georgian label" shape.
export const DELIVERY_METHOD_LABELS: Record<OrderDeliveryMethod, string> = {
  COURIER: "კურიერით მიწოდება",
  PICKUP: "მაღაზიიდან გატანა",
};

export const PAYMENT_METHOD_LABELS: Record<OrderPaymentMethod, string> = {
  CARD: "ბარათით (ონლაინ)",
  ON_DELIVERY: "კურიერთან გადახდა",
  IN_STORE: "მაღაზიაში გადახდა",
};

export const DELIVERY_METHOD_OPTIONS = (Object.keys(DELIVERY_METHOD_LABELS) as OrderDeliveryMethod[]).map(
  (value) => ({ value, label: DELIVERY_METHOD_LABELS[value] }),
);
export const PAYMENT_METHOD_OPTIONS = (Object.keys(PAYMENT_METHOD_LABELS) as OrderPaymentMethod[]).map(
  (value) => ({ value, label: PAYMENT_METHOD_LABELS[value] }),
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
