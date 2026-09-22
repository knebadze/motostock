export const ROLES = {
  USER: "USER",
  ADMIN: "ADMIN",
  // Limited staff/cashier role — view-only across the catalog/vehicle/
  // workshop/FINA-sync admin screens, plus order status changes (see each
  // *.routes.ts's requireRole call sites for exactly which routes grant it).
  // Never assigned via self-registration or OAuth — only an ADMIN can create
  // one (no UI for that yet; done directly via the Role table today).
  OPERATOR: "OPERATOR",
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];
