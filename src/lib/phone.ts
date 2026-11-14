/**
 * Indian mobile numbers only (this salon's customers).
 * Accepts "98123 45678", "+91 98123-45678", "09812345678", "919812345678" → "+919812345678".
 */
export function normalizeIndianMobile(input: string): string | null {
  const digits = input.replace(/[\s\-().]/g, "").replace(/^\+/, "");
  let ten: string;
  if (/^\d{10}$/.test(digits)) ten = digits;
  else if (/^0\d{10}$/.test(digits)) ten = digits.slice(1);
  else if (/^91\d{10}$/.test(digits)) ten = digits.slice(2);
  else return null;
  if (!/^[6-9]\d{9}$/.test(ten)) return null; // Indian mobiles start with 6–9
  return `+91${ten}`;
}

/** "+919812345678" → "+91 98123 45678" */
export function formatPhone(e164: string): string {
  const m = /^\+91(\d{5})(\d{5})$/.exec(e164);
  return m ? `+91 ${m[1]} ${m[2]}` : e164;
}

/** wa.me link with optional prefilled text. */
export function whatsappLink(e164: string, text?: string): string {
  const n = e164.replace(/^\+/, "");
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
