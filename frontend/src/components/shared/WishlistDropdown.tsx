import { CollectionDropdown } from "./CollectionDropdown";
import { listMyWishlist, removeFromWishlist } from "@/lib/api/wishlist";

const heartIcon = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-5"
  >
    <path d="M12 21s-6.7-4.35-9.33-8.2C1.02 10.6 1.6 7.2 4.3 5.6c2.2-1.3 4.9-.8 6.3 1.1l1.4 1.9 1.4-1.9c1.4-1.9 4.1-2.4 6.3-1.1 2.7 1.6 3.28 5 1.63 7.2C18.7 16.65 12 21 12 21Z" />
  </svg>
);

export function WishlistDropdown({ initialCount }: { initialCount: number }) {
  return (
    <CollectionDropdown
      initialCount={initialCount}
      icon={heartIcon}
      headerLabelKey="wishlist"
      viewAllHref="/wishlist"
      translationNamespace="Account.wishlist"
      fetchList={listMyWishlist}
      removeItem={removeFromWishlist}
    />
  );
}
