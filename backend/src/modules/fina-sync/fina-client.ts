import { env } from "../../config/env.js";

// `safeToRetry` answers the one question that matters for the two
// non-idempotent writes (saveDocProductOut/saveDocCustomerReturn): could
// FINA have recorded the document despite this error? true = definitely not
// (never connected, auth failed before the request, or FINA answered and
// refused it) — re-sending can't double it. false = unknown (timeout, a
// dropped connection, a 5xx, an unreadable reply) — FINA may well have
// saved it, so the order-push outbox stops and leaves it to the admin
// instead of retrying blindly. Irrelevant for reads.
export class FinaApiError extends Error {
  constructor(
    message: string,
    readonly safeToRetry = false,
  ) {
    super(message);
  }
}

// Connection-phase failures — the request never reached FINA at all.
const NOT_SENT_ERROR_CODES = new Set([
  "ECONNREFUSED",
  "ENOTFOUND",
  "EAI_AGAIN",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "UND_ERR_CONNECT_TIMEOUT",
]);

function toNetworkError(path: string, err: unknown): FinaApiError {
  if (err instanceof FinaApiError) return err;
  const code = (err as { cause?: { code?: unknown } } | null)?.cause?.code;
  if (typeof code === "string" && NOT_SENT_ERROR_CODES.has(code)) {
    return new FinaApiError(`FINA-სთან კავშირი ვერ დამყარდა (${path}, ${code})`, true);
  }
  const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
  return new FinaApiError(
    timedOut
      ? `FINA-მ ${FINA_REQUEST_TIMEOUT_MS / 1000} წამში არ უპასუხა (${path})`
      : `FINA-სთან კავშირი გაწყდა (${path})`,
    false,
  );
}

interface FinaEnvelope<T> {
  ex: string | null;
  data?: T;
}

interface FinaAuthResponse {
  token: string;
  ex: number;
}

export interface FinaProductRest {
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
    throw new FinaApiError("FINA API არ არის კონფიგურირებული", true);
  }
}

// Every failure here is safeToRetry: authentication runs before the actual
// request, so whatever went wrong, no document was sent.
async function authenticate(): Promise<string> {
  try {
    const res = await fetch(`${env.FINA_BASE_URL}/api/authentication/authenticate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login: env.FINA_LOGIN, password: env.FINA_PASSWORD }),
      signal: AbortSignal.timeout(FINA_REQUEST_TIMEOUT_MS),
    });

    if (!res.ok) {
      throw new FinaApiError(`FINA ავტორიზაცია ვერ მოხერხდა (${res.status})`, true);
    }

    const body = (await res.json()) as FinaAuthResponse;
    if (!body.token) {
      throw new FinaApiError("FINA ავტორიზაციის პასუხს token არ აქვს", true);
    }
    return body.token;
  } catch (err) {
    if (err instanceof FinaApiError) throw err;
    throw new FinaApiError(`FINA ავტორიზაცია ვერ მოხერხდა (${toNetworkError("authenticate", err).message})`, true);
  }
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

// A 4xx or an `ex` error in the envelope means FINA answered and refused —
// nothing was recorded (safeToRetry). A 5xx or a body that isn't the
// expected JSON envelope (e.g. a proxy's HTML error page) leaves it unknown.
async function readFinaResponse<T>(path: string, res: Response): Promise<T> {
  let body: FinaEnvelope<T> | null;
  try {
    body = (await res.json()) as FinaEnvelope<T>;
  } catch {
    body = null;
  }

  if (!res.ok) {
    const detail = body?.ex ? `: ${body.ex}` : "";
    throw new FinaApiError(
      `FINA API-ის მოთხოვნა ვერ შესრულდა (${path}, ${res.status})${detail}`,
      res.status < 500,
    );
  }
  if (!body) {
    throw new FinaApiError(`FINA-ს პასუხი ვერ წავიკითხეთ (${path})`, false);
  }
  if (body.ex) {
    throw new FinaApiError(`FINA API-ის შეცდომა: ${body.ex}`, true);
  }
  return body.data as T;
}

// A 401 means FINA rejected our cached token specifically — it was
// rotated/revoked server-side (a FINA-side session limit, credential
// rotation, or restart) before our own local 35h cache window in getToken()
// expired it. Nothing else in this file ever clears cachedToken, so without
// this, every call for up to 35h keeps handing the same now-dead token back
// out and keeps failing identically — the only recovery was restarting the
// backend process. Retrying exactly once, only on 401, and only after
// clearing the cache so the retry actually uses a fresh token: a 401 means
// FINA rejected the request before doing anything with it, so re-sending is
// safe even for the non-idempotent saveDocProductOut/saveDocCustomerReturn
// calls below — unlike a blind retry-on-any-failure, which for those two
// could double-apply a stock change if the original request actually
// succeeded server-side despite a failed/ambiguous response.
async function fetchWithAuthRetry(
  path: string,
  buildRequest: (headers: Record<string, string>) => Promise<Response>,
): Promise<Response> {
  const headers = await authHeaders();
  let res: Response;
  try {
    res = await buildRequest(headers);
  } catch (err) {
    throw toNetworkError(path, err);
  }
  if (res.status !== 401) return res;

  cachedToken = null;
  cachedTokenExpiresAt = 0;
  const freshHeaders = await authHeaders();
  try {
    return await buildRequest(freshHeaders);
  } catch (err) {
    throw toNetworkError(path, err);
  }
}

async function finaGet<T>(path: string): Promise<T> {
  assertConfigured();
  const res = await fetchWithAuthRetry(path, (headers) =>
    fetch(`${env.FINA_BASE_URL}${path}`, {
      headers,
      signal: AbortSignal.timeout(FINA_REQUEST_TIMEOUT_MS),
    }),
  );
  return readFinaResponse<T>(path, res);
}

async function finaPost<T>(path: string, payload: unknown): Promise<T> {
  assertConfigured();
  const res = await fetchWithAuthRetry(path, (headers) =>
    fetch(`${env.FINA_BASE_URL}${path}`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(FINA_REQUEST_TIMEOUT_MS),
    }),
  );
  return readFinaResponse<T>(path, res);
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
