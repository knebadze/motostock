import { notFound } from "next/navigation";
import { getLookupItemsFromServer } from "@/lib/api/server";
import { isLookupTypeSlug } from "@/config/lookup-types";
import { LookupManager } from "@/components/admin/lookups/LookupManager";

export default async function ClassifierPage({
  params,
}: {
  params: Promise<{ type: string }>;
}) {
  const { type } = await params;
  if (!isLookupTypeSlug(type)) {
    notFound();
  }

  const items = await getLookupItemsFromServer(type);

  return <LookupManager type={type} initialItems={items} />;
}
