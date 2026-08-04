"use client";

import type { ReactNode } from "react";
import { Tabs } from "@/components/shared/Tabs";
import { getLookupTypeLabel, type LookupTypeSlug } from "@/config/lookup-types";
import type { LookupItem } from "@/lib/api/lookups";
import { LookupManager } from "./LookupManager";

export function ClassifiersManager({
  title,
  groups,
  extraTabs = [],
}: {
  title: string;
  groups: { type: LookupTypeSlug; initialItems: LookupItem[] }[];
  // Non-generic-lookup classifiers (e.g. Units, which has its own dedicated
  // model/endpoints rather than fitting the uniform Lookup shape) that still
  // belong in this same tabbed page — appended after the generic ones.
  extraTabs?: { key: string; label: string; content: ReactNode }[];
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>

      <div className="mt-6">
        <Tabs
          tabs={[
            ...groups.map((group) => ({
              key: group.type,
              label: getLookupTypeLabel(group.type),
              content: <LookupManager type={group.type} initialItems={group.initialItems} />,
            })),
            ...extraTabs,
          ]}
        />
      </div>
    </div>
  );
}
