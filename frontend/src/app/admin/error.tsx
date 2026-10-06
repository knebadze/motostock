"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import Link from "next/link";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // Rendering errors never reach the server's logger — report them from
  // here (no-op unless Sentry is built in and switched on; lib/sentry-shared.ts).
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-24 text-center">
      <div className="mx-auto max-w-md">
        <h1 className="text-3xl font-bold tracking-tight">
          შეფერხება მოხდა  
        </h1>
        <p className="mt-3 text-muted-foreground">
          სცადეთ გვერდის განახლება, ან სცადეთ მოგვიანებით.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            ხელახლა ცდა
          </button>
          <Link
            href="/admin"
            className="rounded-full border border-border px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary-text"
          >
            ადმინ პანელზე დაბრუნება
          </Link>
        </div>
      </div>
    </main>
  );
}
