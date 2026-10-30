import { RouteLoading } from "@/components/shared/RouteLoading";

// Private, noindex section — streaming's fixed 200 status doesn't matter
// here, so it keeps a loading fallback (public pages don't; see
// NavigationProgress.tsx).
export default RouteLoading;
