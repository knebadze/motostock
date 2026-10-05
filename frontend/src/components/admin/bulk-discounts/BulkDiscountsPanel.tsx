"use client";

import { listBulkDiscountCandidates } from "@/lib/api/bulk-discounts";
import type { Category } from "@/lib/api/categories";
import { isVehicleCategory } from "@/lib/categories-tree";
import { BulkDiscountPanelShell, type BulkDiscountPanelCopy } from "./BulkDiscountPanelShell";
import { ProductDiscountCandidates } from "./ProductDiscountCandidates";
import { VehicleDiscountCandidates } from "./VehicleDiscountCandidates";

// PRODUCT and VEHICLE_LISTING share the exact same apply/date/event-grouping
// mechanics (BulkDiscountPanelShell) — only the candidate list differs
// (product variants have sku/size/attributeValues, vehicle listings have
// year/condition/specValues). Module-level config so the shell's load
// effect sees stable function/copy identities.

const loadProductCandidates = (categoryId: number) => listBulkDiscountCandidates("PRODUCT", categoryId);
const loadVehicleCandidates = (categoryId: number) => listBulkDiscountCandidates("VEHICLE_LISTING", categoryId);

// Excludes vehicle (transport) categories — those are vehicle listings, not
// products, and belong only in the vehicle panel's own category picker.
const isProductCategory = (categories: Category[], categoryId: number) => !isVehicleCategory(categories, categoryId);

const PRODUCT_COPY: BulkDiscountPanelCopy = {
  intro: (
    <>
      აირჩიეთ კატეგორია — ჩამოიტვირთება მისი (და ქვეკატეგორიების) ყველა პროდუქტის ვარიანტი. დაფილტრეთ
      ბრენდის, ზომის, ფერის ან მახასიათებლების მიხედვით და მონიშნეთ ჩექბოქსებით ზუსტად ის ვარიანტები,
      რომლებზეც გსურთ ფასდაკლების გამოყენება — მონიშვნა ინარჩუნებს მდგომარეობას ფილტრის შეცვლისასაც, ასე
      რომ შეგიძლიათ რამდენიმე ჯერ სხვადასხვა ფილტრით მონიშნოთ სხვადასხვა ვარიანტები ერთ კამპანიაში. შედეგად
      შექმნილი ფასდაკლებები უშუალოდ დაემატება პროდუქტის ვარიანტების ფასდაკლების ცხრილს — შემდეგ, თითოეული
      ინდივიდუალურად რედაქტირებადია/გასაუქმებელია იქიდანვე.
    </>
  ),
  categoryPlaceholder: "აირჩიეთ კატეგორია",
  categoryAriaLabel: "კატეგორია",
  loadError: "პროდუქტების ჩატვირთვა ვერ მოხერხდა",
  itemNoun: "ვარიანტი",
  itemNounDative: "ვარიანტზე",
  eachItemLabel: "თითოეულ ვარიანტს",
};

const VEHICLE_COPY: BulkDiscountPanelCopy = {
  intro: (
    <>
      აირჩიეთ ტრანსპორტის კატეგორია — ჩამოიტვირთება მისი (და ქვეკატეგორიების) ყველა გასაყიდი განცხადება.
      დაფილტრეთ მარკის, მდგომარეობის, ფერის ან მახასიათებლების მიხედვით და მონიშნეთ ჩექბოქსებით ზუსტად ის
      განცხადებები, რომლებზეც გსურთ ფასდაკლების გამოყენება — მონიშვნა ინარჩუნებს მდგომარეობას ფილტრის
      შეცვლისასაც. შედეგად შექმნილი ფასდაკლებები უშუალოდ დაემატება განცხადების ფასდაკლების ცხრილს —
      შემდეგ, თითოეული ინდივიდუალურად რედაქტირებადია/გასაუქმებელია იქიდანვე.
    </>
  ),
  categoryPlaceholder: "აირჩიეთ ტრანსპორტის კატეგორია",
  categoryAriaLabel: "ტრანსპორტის კატეგორია",
  loadError: "განცხადებების ჩატვირთვა ვერ მოხერხდა",
  itemNoun: "განცხადება",
  itemNounDative: "განცხადებაზე",
  eachItemLabel: "თითოეულ განცხადებას",
};

export function BulkProductDiscountsPanel({ categories }: { categories: Category[] }) {
  return (
    <BulkDiscountPanelShell
      categories={categories}
      targetType="PRODUCT"
      includeCategory={isProductCategory}
      loadCandidates={loadProductCandidates}
      copy={PRODUCT_COPY}
      renderCandidates={(props) => <ProductDiscountCandidates {...props} />}
    />
  );
}

export function BulkVehicleListingDiscountsPanel({ categories }: { categories: Category[] }) {
  return (
    <BulkDiscountPanelShell
      categories={categories}
      targetType="VEHICLE_LISTING"
      includeCategory={isVehicleCategory}
      loadCandidates={loadVehicleCandidates}
      copy={VEHICLE_COPY}
      renderCandidates={(props) => <VehicleDiscountCandidates {...props} />}
    />
  );
}
