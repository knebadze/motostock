"use client";

import { Tabs } from "@/components/shared/Tabs";
import { getLookupTypeLabel, type LookupTypeSlug } from "@/config/lookup-types";
import type { LookupItem } from "@/lib/api/lookups";
import { LookupManager } from "./LookupManager";

export function ClassifiersManager({
  groups,
}: {
  groups: { type: LookupTypeSlug; initialItems: LookupItem[] }[];
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">ტრანსპორტის კლასიფიკატორები</h1>

      <div className="mt-6">
        <Tabs
          tabs={groups.map((group) => ({
            key: group.type,
            label: getLookupTypeLabel(group.type),
            content: <LookupManager type={group.type} initialItems={group.initialItems} />,
          }))}
        />
      </div>
    </div>
  );
}
