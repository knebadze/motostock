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

// Line-item shape shared by saveDocProductOut/saveDocCustomerReturn's
// `products` array — sub_id is FINA's product-sub-code concept (this
// codebase has no equivalent, always 0).
export interface FinaSaleLine {
  id: number;
  quantity: number;
  price: number;
}

export interface SaveDocProductOutInput {
  date: string;
  purpose: string;
  amount: number;
  store: number;
  customer: number;
  user: number;
  payType: number;
  products: FinaSaleLine[];
}

export interface SaveDocCustomerReturnLine extends FinaSaleLine {
  outId: number;
}

export interface SaveDocCustomerReturnInput {
  date: string;
  purpose: string;
  amount: number;
  store: number;
  customer: number;
  user: number;
  payType: number;
  products: SaveDocCustomerReturnLine[];
}

interface FinaSaveDocResponse {
  id: number;
}

let cachedToken: string | null = null;
let cachedTokenExpiresAt = 0;

// Bounds every FINA call so a slow/hanging FINA never blocks its caller
// indefinitely — bare `fetch` has no default timeout (undici's is minutes
// long), and the checkout path (syncVariantStockByIds) awaits this
// synchronously before a customer's order can be placed.
const FINA_REQUEST_TIMEOUT_MS = 8_000;

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
    signal: AbortSignal.timeout(FINA_REQUEST_TIMEOUT_MS),
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

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getToken();
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (env.FINA_TENANT_KEY) {
    headers.tenant_key = env.FINA_TENANT_KEY;
  }
  return headers;
}

function parseFinaEnvelope<T>(path: string, status: number, ok: boolean, body: FinaEnvelope<T>): T {
  if (!ok) {
    throw new FinaApiError(`FINA API-ის მოთხოვნა ვერ შესრულდა (${path}, ${status})`);
  }
  if (body.ex) {
    throw new FinaApiError(`FINA API-ის შეცდომა: ${body.ex}`);
  }
  return body.data as T;
}

async function finaGet<T>(path: string): Promise<T> {
  assertConfigured();
  const headers = await authHeaders();
  const res = await fetch(`${env.FINA_BASE_URL}${path}`, {
    headers,
    signal: AbortSignal.timeout(FINA_REQUEST_TIMEOUT_MS),
  });
  const body = (await res.json()) as FinaEnvelope<T>;
  return parseFinaEnvelope(path, res.status, res.ok, body);
}

async function finaPost<T>(path: string, payload: unknown): Promise<T> {
  assertConfigured();
  const headers = await authHeaders();
  const res = await fetch(`${env.FINA_BASE_URL}${path}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(FINA_REQUEST_TIMEOUT_MS),
  });
  const body = (await res.json()) as FinaEnvelope<T>;
  return parseFinaEnvelope(path, res.status, res.ok, body);
}

export function getProductsRestByStore(store: string): Promise<FinaProductRest[]> {
  return finaGet<FinaProductRest[]>(`/api/operation/getProductsRestByStore/${encodeURIComponent(store)}`);
}

// Same response shape as getProductsRestByStore (rest broken down per store),
// but scoped to a caller-supplied list of FINA product ids instead of "every
// product in one store" — used for the admin order-detail "check this
// order's stock" action (see fina-sync.service.ts's syncOrderStock), where
// pulling the whole catalog just to filter a handful of ids client-side
// would be wasteful.
export function getProductsRestArray(prods: number[]): Promise<FinaProductRest[]> {
  return finaPost<FinaProductRest[]>("/api/operation/getProductsRestArray", { prods });
}

// Records a sale in FINA (saveDocProductOut) — decrements FINA stock for the
// given products and returns the new operation's id, which must be kept so a
// later cancellation can reference it via saveDocCustomerReturn's out_id.
// w_type=3 (no transport) and overlap_type=0 since a web order has no
// waybill/driver/advance-overlap data to report; num=0/num_pfx="" let FINA
// assign the document number itself.
export async function saveDocProductOut(input: SaveDocProductOutInput): Promise<number> {
  const body = {
    id: 0,
    date: input.date,
    num_pfx: "",
    num: 0,
    purpose: input.purpose,
    amount: input.amount,
    currency: "GEL",
    rate: 1,
    store: input.store,
    user: input.user,
    staff: 0,
    project: 0,
    customer: input.customer,
    is_vat: true,
    make_entry: true,
    pay_type: input.payType,
    price_type: 3,
    w_type: 3,
    t_type: 1,
    t_payer: 1,
    w_cost: 0,
    foreign: false,
    drv_name: "",
    tr_start: "",
    tr_end: "",
    driver_id: "",
    car_num: "",
    tr_text: "",
    sender: "",
    reciever: "",
    comment: "",
    overlap_type: 0,
    overlap_amount: 0,
    products: input.products.map((line) => ({
      id: line.id,
      sub_id: 0,
      quantity: line.quantity,
      price: line.price,
    })),
    services: [],
  };
  const response = await finaPost<FinaSaveDocResponse>("/api/operation/saveDocProductOut", body);
  return response.id;
}

// Records a return-from-customer in FINA (saveDocCustomerReturn) —
// increments FINA stock back. Each product line's out_id must point at the
// saveDocProductOut operation id the original sale was recorded under, or
// FINA has nothing to "return" against.
export async function saveDocCustomerReturn(input: SaveDocCustomerReturnInput): Promise<number> {
  const body = {
    id: 0,
    date: input.date,
    num_pfx: "",
    num: 0,
    purpose: input.purpose,
    amount: input.amount,
    currency: "GEL",
    rate: 1,
    store: input.store,
    user: input.user,
    staff: 0,
    project: 0,
    customer: input.customer,
    is_vat: true,
    make_entry: true,
    pay_type: input.payType,
    t_type: 1,
    t_payer: 1,
    w_cost: 0,
    foreign: false,
    drv_name: "",
    tr_start: "",
    tr_end: "",
    driver_id: "",
    car_num: "",
    tr_text: "",
    products: input.products.map((line) => ({
      id: line.id,
      sub_id: 0,
      quantity: line.quantity,
      price: line.price,
      out_id: line.outId,
    })),
  };
  const response = await finaPost<FinaSaveDocResponse>(
    "/api/operation/saveDocCustomerReturn",
    body,
  );
  return response.id;
}
