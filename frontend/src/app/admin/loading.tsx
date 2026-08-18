import { Loader } from "@/components/shared/Loader";

// Covers every route under admin/(protected)/ — including that layout's own
// auth check/user fetch, since this file sits one level above it (same
// reasoning as [locale]/loading.tsx). No next-intl here — the admin panel is
// deliberately Georgian-only, matching every other admin-only component.
export default function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center py-24">
      <Loader size="lg" className="text-primary" />
    </div>
  );
}
