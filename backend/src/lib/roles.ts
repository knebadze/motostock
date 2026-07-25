export const ROLES = {
  USER: "USER",
  ADMIN: "ADMIN",
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];
