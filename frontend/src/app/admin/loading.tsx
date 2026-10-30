import { Loader } from "@/components/shared/Loader";

// Covers every route under admin/(protected)/ — including that layout's own
// auth check/user fetch, since this file sits one level above it (a
// loading.tsx never wraps its own folder's layout). Fine here: the admin is
// never indexed, so streaming's fixed 200 status doesn't matter (the public
// [locale]/ one was removed for exactly that reason — see
// NavigationProgress.tsx). No next-intl here — the admin panel is
// deliberately Georgian-only, matching every other admin-only component.
export default function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center py-24">
      <Loader size="lg" className="text-primary-text" />
    </div>
  );
}
