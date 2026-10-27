import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { test } from "@playwright/test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// The admin suites run in dependency order (catalog → products → ...), and
// the later deletion phase needs to know exactly which rows earlier runs
// created. Each group writes what it made to e2e/.admin-state/<group>.json
// (gitignored), and later groups read it back instead of guessing by name.

const STATE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../../.admin-state");

// One short, unique token per run, appended to every E2E-TEST name/slug.
export function e2eRun(): string {
  return Date.now().toString(36);
}

export function saveState(group: string, data: unknown): void {
  if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(resolve(STATE_DIR, `${group}.json`), JSON.stringify(data, null, 2));
}

export function loadState<T>(group: string): T {
  const file = resolve(STATE_DIR, `${group}.json`);
  if (!existsSync(file)) {
    throw new Error(`No saved state for "${group}" — run tests/admin/*${group}* first`);
  }
  return JSON.parse(readFileSync(file, "utf-8")) as T;
}

// Backend responses wrap the row in a single named key ({ category }, { item },
// ...); returns that row.
export function entityOf(body: unknown): { id: number } & Record<string, unknown> {
  if (body && typeof body === "object") {
    if ("id" in body) return body as { id: number };
    for (const value of Object.values(body)) {
      if (value && typeof value === "object" && !Array.isArray(value) && "id" in value) {
        return value as { id: number };
      }
    }
  }
  throw new Error(`No entity in response: ${JSON.stringify(body).slice(0, 300)}`);
}

// A non-blocking discrepancy: recorded (test annotation + findings.jsonl)
// instead of failing, so one wrong-but-harmless behavior doesn't stop the
// serial dependency chain behind it. Hard failures still use expect().
export function checkFinding(ok: boolean, title: string, detail: string): void {
  if (ok) return;
  test.info().annotations.push({ type: "finding", description: `${title} — ${detail}` });
  if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
  appendFileSync(
    resolve(STATE_DIR, "findings.jsonl"),
    JSON.stringify({ at: new Date().toISOString(), test: test.info().titlePath.join(" › "), title, detail }) + "\n",
  );
  console.warn(`FINDING: ${title} — ${detail}`);
}
