import { env } from "../../config/env.js";

export class FinaApiError extends Error {}

interface FinaEnvelope<T> {
  ex: string | null;
  data?: T;
}

interface FinaAuthResponse {
  token: string;
  ex: number;
}

interface FinaProductRest {
  id: number;
  store: string;
  rest: number;
  reserve: number;
}

let cachedToken: string | null = null;
let cachedTokenExpiresAt = 0;

export function isFinaConfigured(): boolean {
  return Boolean(env.FINA_BASE_URL && env.FINA_LOGIN && env.FINA_PASSWORD && env.FINA_STORE);
}

function assertConfigured() {
  if (!isFinaConfigured()) {
    throw new FinaApiError("FINA API არ არის კონფიგურირებული");
  }
}

async function authenticate(): Promise<string> {
  const res = await fetch(`${env.FINA_BASE_URL}/api/authentication/authenticate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login: env.FINA_LOGIN, password: env.FINA_PASSWORD }),
  });

  if (!res.ok) {
    throw new FinaApiError(`FINA ავტორიზაცია ვერ მოხერხდა (${res.status})`);
  }

  const body = (await res.json()) as FinaAuthResponse;
  return body.token;
}

async function getToken(): Promise<string> {
  const now = Date.now();
  // FINA tokens are documented as valid for 36h — refresh a little early
  // so a request never fires with a token that expires mid-flight.
  if (cachedToken && now < cachedTokenExpiresAt) {
    return cachedToken;
  }

  const token = await authenticate();
  cachedToken = token;
  cachedTokenExpiresAt = now + 35 * 60 * 60 * 1000;
  return token;
}

async function finaGet<T>(path: string): Promise<T> {
  assertConfigured();
  const token = await getToken();

  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (env.FINA_TENANT_KEY) {
    headers.tenant_key = env.FINA_TENANT_KEY;
  }

  const res = await fetch(`${env.FINA_BASE_URL}${path}`, { headers });

  if (!res.ok) {
    throw new FinaApiError(`FINA API-ის მოთხოვნა ვერ შესრულდა (${path}, ${res.status})`);
  }

  const body = (await res.json()) as FinaEnvelope<T>;
  if (body.ex) {
    throw new FinaApiError(`FINA API-ის შეცდომა: ${body.ex}`);
  }

  return body.data as T;
}

export function getProductsRestByStore(store: string): Promise<FinaProductRest[]> {
  return finaGet<FinaProductRest[]>(`/api/operation/getProductsRestByStore/${encodeURIComponent(store)}`);
}
