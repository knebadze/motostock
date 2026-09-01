export class ApiError extends Error {
  statusCode: number;
  // Stable, locale-independent identifier (e.g. "OUT_OF_STOCK") for
  // customer-facing errors — the frontend maps this to a next-intl
  // translation (see frontend's Errors.* messages + resolveApiErrorMessage)
  // instead of showing `message` (always Georgian) directly to an EN/RU
  // visitor. Admin-only errors can omit it — the admin panel is Georgian-only
  // by design and just shows `message` as-is regardless. Optional rather
  // than required so every existing throw site didn't need touching at
  // once; codes are being filled in module by module.
  code?: string;
  // Values for the translated message's ICU placeholders (e.g.
  // { limit: 4 } for "up to {limit} items") — only meaningful alongside a
  // `code` whose Errors.* translation actually references them.
  params?: Record<string, string | number>;

  constructor(
    statusCode: number,
    message: string,
    code?: string,
    params?: Record<string, string | number>,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.params = params;
    this.name = "ApiError";
  }
}
