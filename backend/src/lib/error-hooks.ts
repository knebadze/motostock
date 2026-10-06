// Subscribers to every logger.error(...) call (see lib/logger.ts's
// persistErrorLog) — Sentry capture and the admin error-alert email digest
// register here at startup (server.ts). A registry instead of direct imports
// because the logger is imported by nearly everything, including the
// settings service those subscribers depend on — importing them from
// logger.ts would create import cycles.
export type LoggedError = {
  message: string;
  stack: string | null;
  context: Record<string, unknown> | null;
  // The original Error, when one was logged — keeps Sentry's own stack
  // parsing/grouping instead of a re-created error.
  error: Error | null;
};

type LoggedErrorHook = (loggedError: LoggedError) => void;

const hooks: LoggedErrorHook[] = [];

export function onLoggedError(hook: LoggedErrorHook): void {
  hooks.push(hook);
}

export function emitLoggedError(loggedError: LoggedError): void {
  for (const hook of hooks) {
    try {
      hook(loggedError);
    } catch {
      // A subscriber must never break logging (same rule as persistErrorLog).
    }
  }
}
