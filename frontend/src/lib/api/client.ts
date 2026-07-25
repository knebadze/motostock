import axios, { type AxiosError } from "axios";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

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
