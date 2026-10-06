"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // Rendering errors never reach the server's logger — report them from
  // here (no-op unless Sentry is built in and switched on; lib/sentry-shared.ts).
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Arial, Helvetica, sans-serif",
          background: "#ffffff",
          color: "#18181b",
        }}
      >
        <div style={{ textAlign: "center", padding: "1.5rem" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>
            Something went wrong
          </h1>
          <p style={{ marginTop: "0.5rem", color: "#71717a" }}>
            Please try refreshing the page.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: "1.5rem",
              borderRadius: "9999px",
              background: "#facc15",
              color: "#18181b",
              fontWeight: 600,
              padding: "0.75rem 1.5rem",
              border: "none",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
