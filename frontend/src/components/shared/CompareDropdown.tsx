import { CollectionDropdown } from "./CollectionDropdown";
import { listMyCompare, removeFromCompare } from "@/lib/api/compare";

const scalesIcon = (
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
    <path d="M4 20h16M7 20V10m5 10V4m5 16v-7" />
  </svg>
);

export function CompareDropdown({ initialCount }: { initialCount: number }) {
  return (
    <CollectionDropdown
      initialCount={initialCount}
      icon={scalesIcon}
      headerLabelKey="compare"
      viewAllHref="/compare"
      translationNamespace="Account.compare"
      fetchList={listMyCompare}
      removeItem={removeFromCompare}
    />
  );
}
