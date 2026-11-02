type NamedLookup = { key?: string; nameKa: string } | null;

// The catalog spec fields both admin detail modals show (catalog entry and
// vehicle listing) — structural, so either one's catalog shape fits.
export type VehicleCatalogSpecs = {
  yearFrom: number | null;
  yearTo: number | null;
  engineVolumeCc: number | null;
  enginePowerHp: number | null;
  cylinderCount: number | null;
  gearCount: number | null;
  seatCount: number | null;
  weightKg: number | null;
  seatHeightMm: number | null;
  fuelTankLiters: number | null;
  oilCapacityLiters: number | null;
  topSpeedKmh: number | null;
  hasAbs: boolean | null;
  hasLockingDifferential: boolean | null;
  motorPowerWatt: number | null;
  batteryCapacityWh: number | null;
  rangeKm: number | null;
  chargingTimeMinutes: number | null;
  fuelType: NamedLookup;
  transmissionType: NamedLookup;
  coolingType: NamedLookup;
  finalDriveType: NamedLookup;
  driveType: NamedLookup;
  startType: NamedLookup;
  powertrainType: NamedLookup;
};

export function boolLabel(value: boolean | null): string {
  return value == null ? "—" : value ? "კი" : "არა";
}

function num(value: number | null): string {
  return value != null ? String(value) : "—";
}

export function catalogYearsLabel(catalog: { yearFrom: number | null; yearTo: number | null }): string {
  return catalog.yearFrom || catalog.yearTo ? `${catalog.yearFrom ?? "?"}–${catalog.yearTo ?? "?"}` : "—";
}

// Electric vehicles show motor/battery fields instead of the combustion
// engine ones.
export function vehicleCatalogSpecRows(catalog: VehicleCatalogSpecs): { label: string; value: string }[] {
  const isElectric = catalog.powertrainType?.key === "ELECTRIC";
  return [
    { label: "მოდელის წლები", value: catalogYearsLabel(catalog) },
    { label: "ძრავის ტიპი", value: catalog.powertrainType?.nameKa ?? "—" },
    ...(isElectric
      ? [
          { label: "ძრავის სიმძლავრე (ვტ)", value: num(catalog.motorPowerWatt) },
          { label: "აკუმულატორი (Wh)", value: num(catalog.batteryCapacityWh) },
          { label: "სავალი მანძილი (კმ)", value: num(catalog.rangeKm) },
          { label: "დამუხტვის დრო (წთ)", value: num(catalog.chargingTimeMinutes) },
        ]
      : [
          { label: "მოცულობა (cc)", value: num(catalog.engineVolumeCc) },
          { label: "სიმძლავრე (ც.ძ)", value: num(catalog.enginePowerHp) },
          { label: "ცილინდრები", value: num(catalog.cylinderCount) },
          { label: "გადაცემები", value: num(catalog.gearCount) },
          { label: "საწვავის ტიპი", value: catalog.fuelType?.nameKa ?? "—" },
          { label: "საწვავის ავზი (ლ)", value: num(catalog.fuelTankLiters) },
          { label: "ზეთის მოცულობა (ლ)", value: num(catalog.oilCapacityLiters) },
          { label: "გაშვების სისტემა", value: catalog.startType?.nameKa ?? "—" },
        ]),
    { label: "ადგილები", value: num(catalog.seatCount) },
    { label: "წონა (კგ)", value: num(catalog.weightKg) },
    { label: "სავარძლის სიმაღლე (მმ)", value: num(catalog.seatHeightMm) },
    { label: "მაქს. სიჩქარე (კმ/სთ)", value: num(catalog.topSpeedKmh) },
    { label: "ABS", value: boolLabel(catalog.hasAbs) },
    { label: "გადაცემათა კოლოფი", value: catalog.transmissionType?.nameKa ?? "—" },
    { label: "გაგრილება", value: catalog.coolingType?.nameKa ?? "—" },
    { label: "საბოლოო გადაცემა", value: catalog.finalDriveType?.nameKa ?? "—" },
    { label: "წამყვანი თვლები", value: catalog.driveType?.nameKa ?? "—" },
    { label: "დიფერენციალის ბლოკირება", value: boolLabel(catalog.hasLockingDifferential) },
  ];
}
