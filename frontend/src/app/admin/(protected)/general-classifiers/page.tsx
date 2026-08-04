import { getLookupItemsFromServer, getUnitsFromServer } from "@/lib/api/server";
import { GENERAL_LOOKUP_TYPES } from "@/config/lookup-types";
import { ClassifiersManager } from "@/components/admin/lookups/ClassifiersManager";
import { UnitsManager } from "@/components/admin/units/UnitsManager";

export default async function GeneralClassifiersPage() {
  const [items, units] = await Promise.all([
    Promise.all(GENERAL_LOOKUP_TYPES.map((lookupType) => getLookupItemsFromServer(lookupType.slug))),
    getUnitsFromServer(),
  ]);

  const groups = GENERAL_LOOKUP_TYPES.map((lookupType, index) => ({
    type: lookupType.slug,
    initialItems: items[index],
  }));

  return (
    <ClassifiersManager
      title="საერთო კლასიფიკატორები"
      groups={groups}
      extraTabs={[
        { key: "units", label: "ერთეულები", content: <UnitsManager initialUnits={units} /> },
      ]}
    />
  );
}
