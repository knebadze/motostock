// Single source of truth for which environment the suite targets. Override
// via env vars (e.g. in CI, or when pointing at a deployed test server)
// instead of editing URLs/ports in individual config or test files.
export const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
export const BACKEND_URL = process.env.E2E_BACKEND_URL ?? "http://localhost:4000";

// Local dev servers only get auto-started when no override was given. Once
// E2E_BASE_URL points at a real (test/staging) server, that server is
// managed on its own — the suite should never try to spawn `npm run dev`
// against it.
export const IS_LOCAL = !process.env.E2E_BASE_URL;
