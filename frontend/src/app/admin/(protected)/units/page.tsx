import { getUnitsFromServer } from "@/lib/api/server";
import { UnitsManager } from "@/components/admin/units/UnitsManager";

export default async function UnitsPage() {
  const units = await getUnitsFromServer();

  return <UnitsManager initialUnits={units} />;
}
