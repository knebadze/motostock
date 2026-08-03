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
    details?: { path: string; message: string }[];
  };
};

export class ApiRequestError extends Error {
  status?: number;
  details?: { path: string; message: string }[];

  constructor(
    message: string,
    status?: number,
    details?: { path: string; message: string }[],
  ) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.details = details;
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorPayload>) => {
    const message =
      error.response?.data?.error?.message ?? error.message ?? "Unexpected error";
    const details = error.response?.data?.error?.details;
    return Promise.reject(new ApiRequestError(message, error.response?.status, details));
  },
);
