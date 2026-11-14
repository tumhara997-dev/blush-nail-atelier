/** All money is stored as integer paise (₹1 = 100 paise). */
const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export function formatPaise(paise: number): string {
  return inr.format(Math.round(paise / 100));
}

/** "1,250" or "1250.50" (rupees, from a form) → paise. Returns null when empty/invalid. */
export function rupeesToPaise(input: FormDataEntryValue | null | undefined): number | null {
  if (input == null) return null;
  const s = String(input).replace(/[,₹\s]/g, "");
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function paiseToRupeesInput(paise: number | null | undefined): string {
  return paise == null ? "" : String(paise / 100);
}

export function priceLabel(s: { priceType: string; basePrice: number | null }): string {
  if (s.priceType === "ON_ENQUIRY" || s.basePrice == null) return "Price on enquiry";
  return s.priceType === "FROM" ? `Starting ${formatPaise(s.basePrice)}` : formatPaise(s.basePrice);
}
