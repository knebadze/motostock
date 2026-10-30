import { Link } from "@/i18n/navigation";

// Shown instead of AddToCartButton for items whose category an admin
// switched off for online purchase (Category.onlinePurchaseEnabled — e.g.
// vehicles). Links to the contact page (address, hours, phone).
export function ShowroomPurchaseNotice({ label }: { label: string }) {
  return (
    <Link
      href="/contact"
      className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/5 px-6 py-2.5 text-sm font-semibold text-primary-text transition-colors hover:bg-primary/10"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-4 shrink-0"
        aria-hidden
      >
        <path d="M3 9.5 12 4l9 5.5" />
        <path d="M5 10v9h14v-9" />
        <path d="M10 19v-5h4v5" />
      </svg>
      {label}
    </Link>
  );
}
