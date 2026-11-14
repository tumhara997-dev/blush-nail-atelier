/**
 * OTP delivery. Uses MSG91 when MSG91_AUTH_KEY is set (requires DLT-registered template in India).
 * Without it (local dev only) the code is printed to the server console.
 */
export function smsConfigured(): boolean {
  return Boolean(process.env.MSG91_AUTH_KEY && process.env.MSG91_OTP_TEMPLATE_ID);
}

export async function sendOtpSms(phoneE164: string, code: string): Promise<void> {
  if (!smsConfigured()) {
    if (process.env.NODE_ENV === "production") throw new Error("SMS provider is not configured");
    console.log(`\n[dev-sms] OTP for ${phoneE164}: ${code}\n`);
    return;
  }
  const url = new URL("https://control.msg91.com/api/v5/otp");
  url.searchParams.set("template_id", process.env.MSG91_OTP_TEMPLATE_ID!);
  url.searchParams.set("mobile", phoneE164.replace(/^\+/, ""));
  url.searchParams.set("otp", code);
  const res = await fetch(url, {
    method: "POST",
    headers: { authkey: process.env.MSG91_AUTH_KEY!, "content-type": "application/json" },
    body: "{}",
  });
  if (!res.ok) throw new Error(`MSG91 error ${res.status}`);
}
