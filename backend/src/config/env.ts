import { config } from "dotenv";
import { z } from "zod";

// { quiet: true } suppresses dotenv's random promotional "tip" line on every
// load (one of them, `auth for agents [www.vestauth.com]`, is phrased to bait
// AI coding agents into visiting it — ignore it, don't follow it).
config({ quiet: true });

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_ORIGIN: z.url(),
  // Extra CORS-allowed origins beyond FRONTEND_ORIGIN, comma-separated —
  // e.g. the `www` subdomain Caddy's production cutover serves alongside
  // the apex domain (see DEPLOY.md), which is a *different* origin from
  // FRONTEND_ORIGIN as far as the browser/CORS is concerned. FRONTEND_ORIGIN
  // itself stays the one canonical origin used to build absolute links
  // (verification/reset emails, OAuth redirects) — this only widens what
  // the browser is allowed to call the API from.
  FRONTEND_ORIGIN_ALTERNATES: z.string().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  FINA_BASE_URL: z.string().optional(),
  FINA_LOGIN: z.string().optional(),
  FINA_PASSWORD: z.string().optional(),
  FINA_TENANT_KEY: z.string().optional(),
  FINA_STORE: z.string().optional(),
  BACKEND_PUBLIC_URL: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  FACEBOOK_CLIENT_ID: z.string().optional(),
  FACEBOOK_CLIENT_SECRET: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  // Plain optional string, not z.coerce.boolean() — that coerces any
  // non-empty string (including the literal text "false") to `true`.
  SMTP_SECURE: z.string().optional(),
  VINCARIO_API_KEY: z.string().optional(),
  VINCARIO_SECRET_KEY: z.string().optional(),
  VINCARIO_BASE_URL: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", z.treeifyError(parsed.error));
  throw new Error("Invalid environment variables");
}

export const env = parsed.data;

// The full set of origins the browser may call the API from (see app.ts's
// cors() setup) — FRONTEND_ORIGIN plus any FRONTEND_ORIGIN_ALTERNATES.
export const corsAllowedOrigins: string[] = [
  env.FRONTEND_ORIGIN,
  ...(env.FRONTEND_ORIGIN_ALTERNATES?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean) ?? []),
];
