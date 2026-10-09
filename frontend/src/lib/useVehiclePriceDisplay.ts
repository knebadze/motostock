"use client";

import { useState } from "react";
import { useUsdToGelRate } from "./useUsdToGelRate";
import type { VehicleListingCurrency } from "./api/vehicle-listings";

// Shared by VehicleListingCard.tsx and VehicleListingDetailPage.tsx — a
// listing's price is always stored+shown in its own `priceCurrency` by
// default; this lets the shopper flip to the converted other-currency
// amount using the live NBG rate (useUsdToGelRate.ts). `canToggle` is false
// (and toggled stays false) while the rate isn't available yet — showing an
// unconverted number under the wrong currency symbol would be actively
// wrong, not just unavailable.
export function useVehiclePriceDisplay(nativeCurrency: VehicleListingCurrency) {
  const { rate } = useUsdToGelRate();
  const [toggled, setToggled] = useState(false);
  const canToggle = rate != null;
  const showConverted = canToggle && toggled;
  const otherCurrency: VehicleListingCurrency = nativeCurrency === "USD" ? "GEL" : "USD";
  const displayCurrency = showConverted ? otherCurrency : nativeCurrency;

  function convert(amount: number): number {
    if (rate == null || !showConverted) return amount;
    return nativeCurrency === "USD" ? amount * rate : amount / rate;
  }

  function toggle() {
    if (canToggle) setToggled((current) => !current);
  }

  // Whichever currency isn't currently shown — i.e. what clicking the
  // toggle would switch to. Passed to CurrencyToggleButton so its own label
  // shows the destination currency's symbol, not an abstract icon.
  const targetCurrency = showConverted ? nativeCurrency : otherCurrency;

  return { displayCurrency, targetCurrency, convert, toggle, canToggle };
}
