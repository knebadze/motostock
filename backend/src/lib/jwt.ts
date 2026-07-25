import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { RoleName } from "./roles.js";

export const AUTH_COOKIE_NAME = "motostock_token";

export type JwtPayload = {
  sub: number;
  role: RoleName;
};

export function signJwt(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

export function verifyJwt(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as unknown as JwtPayload;
}
