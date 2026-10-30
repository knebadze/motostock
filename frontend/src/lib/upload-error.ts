import { ApiRequestError } from "@/lib/api/client";

// "Saved, but the image upload failed" toasts used to swallow the reason —
// a rate limit, a rejected/oversized file and a bad request all read the
// same. Appends the backend's own (Georgian) message when there is one.
export function uploadFailedMessage(message: string, error: unknown): string {
  return error instanceof ApiRequestError && error.message ? `${message}: ${error.message}` : message;
}
