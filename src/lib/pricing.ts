export type PricedService = { priceType: "FIXED" | "FROM" | "ON_ENQUIRY"; basePrice: number | null; durationMin: number };
export type PricedVariant = { price: number; durationMin: number } | null | undefined;
export type PricedAddOn = { price: number; durationMin: number };

export type Estimate = {
  durationMin: number;
  /** Exact price when known (fixed service or a chosen variant). */
  price: number | null;
  /** Lower bound for "starting from" services. */
  fromPrice: number | null;
};

export function estimate(service: PricedService, variant: PricedVariant, addOns: PricedAddOn[]): Estimate {
  const addOnPrice = addOns.reduce((s, a) => s + a.price, 0);
  const addOnMin = addOns.reduce((s, a) => s + a.durationMin, 0);
  const durationMin = (variant?.durationMin ?? service.durationMin) + addOnMin;

  if (variant) return { durationMin, price: variant.price + addOnPrice, fromPrice: null };
  if (service.priceType === "FIXED" && service.basePrice != null) {
    return { durationMin, price: service.basePrice + addOnPrice, fromPrice: null };
  }
  if (service.priceType === "FROM" && service.basePrice != null) {
    return { durationMin, price: null, fromPrice: service.basePrice + addOnPrice };
  }
  return { durationMin, price: null, fromPrice: null };
}
