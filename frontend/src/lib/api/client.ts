import axios, { type AxiosError } from "axios";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
  // Axios's default array serialization is `key[]=1&key[]=2` — Express 5
  // (this backend) defaults to the "simple" query parser (plain
  // node:querystring, not qs), which reads that literally as one key named
  // "key[]" instead of an array under "key". `indexes: null` switches to
  // bare repeated keys (`key=1&key=2`), which node:querystring does collect
  // into an array — required for every array-valued query param (brandIds, etc).
  paramsSerializer: { indexes: null },
});

export const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/api\/?$/, "");

export function resolveMediaUrl(path: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path) || path.startsWith("blob:")) return path;
  return `${API_ORIGIN}${path}`;
}

type ApiErrorPayload = {
  error: {
    message: string;
    code?: string;
    params?: Record<string, string | number>;
    details?: { path: string; message: string }[];
  };
};

export class ApiRequestError extends Error {
  status?: number;
  // Stable identifier (e.g. "OUT_OF_STOCK") the backend attaches to
  // customer-facing errors — see lib/api-errors.ts's
  // resolveApiErrorMessage, which maps this to a translated message instead
  // of `message` (always Georgian, backend has no locale awareness).
  // Undefined for network/parse failures that never reached the backend,
  // and for older/admin-only errors that don't set one yet.
  code?: string;
  // ICU placeholder values for the translated message (e.g. { limit: 4 }) —
  // only meaningful alongside `code`.
  params?: Record<string, string | number>;
  details?: { path: string; message: string }[];

  constructor(
    message: string,
    status?: number,
    details?: { path: string; message: string }[],
    code?: string,
    params?: Record<string, string | number>,
  ) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.details = details;
    this.code = code;
    this.params = params;
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorPayload>) => {
    const message =
      error.response?.data?.error?.message ?? error.message ?? "Unexpected error";
    const details = error.response?.data?.error?.details;
    const code = error.response?.data?.error?.code;
    const params = error.response?.data?.error?.params;
    return Promise.reject(
      new ApiRequestError(message, error.response?.status, details, code, params),
    );
  },
);
