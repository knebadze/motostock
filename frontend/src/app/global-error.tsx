"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
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
