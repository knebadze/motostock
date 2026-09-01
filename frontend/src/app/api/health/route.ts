import { NextResponse } from "next/server";

// Docker healthcheck target only (see docker-compose.yml) — deliberately
// outside [locale]/admin (proxy.ts's matcher already skips /api/*), so a
// check never pays for locale resolution or a page render.
export function GET() {
  return NextResponse.json({ status: "ok" });
}
