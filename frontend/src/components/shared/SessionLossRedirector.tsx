"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { registerSessionLossHandler } from "@/lib/api/session-loss";

// Mounted once in RootShell.tsx (shared by both the admin and customer root
// layouts) purely to give client.ts's axios interceptor a real router to
// call — see session-loss.ts. Plain next/navigation's router, not the
// locale-aware @/i18n/navigation one: client.ts already builds the full
// target path itself (including the /admin or /{locale} prefix), so no
// further locale handling is needed here. Renders nothing.
export function SessionLossRedirector() {
  const router = useRouter();

  useEffect(() => {
    registerSessionLossHandler((loginUrl) => router.push(loginUrl));
    return () => registerSessionLossHandler(null);
  }, [router]);

  return null;
}
