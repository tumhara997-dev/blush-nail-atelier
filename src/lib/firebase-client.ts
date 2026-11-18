"use client";

import type { Auth } from "firebase/auth";

// Public web config (safe to ship to browsers). Set in Netlify env vars; inlined at build time.
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** True when Firebase Phone Auth is configured — the login form then sends codes through Google. */
export const firebaseEnabled = Boolean(config.apiKey && config.projectId);

let cached: Promise<{ auth: Auth; mod: typeof import("firebase/auth") }> | null = null;

/** Loads the Firebase SDK on demand (only on the login screen, only when used). */
export function loadFirebaseAuth() {
  cached ??= (async () => {
    const [{ initializeApp, getApps }, mod] = await Promise.all([import("firebase/app"), import("firebase/auth")]);
    const app = getApps()[0] ?? initializeApp(config);
    const auth = mod.getAuth(app);
    auth.languageCode = "en";
    return { auth, mod };
  })();
  return cached;
}

/** Friendly messages for the Firebase errors a customer can actually hit. */
export function firebaseErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/invalid-phone-number":
      return "Please enter a valid 10-digit Indian mobile number.";
    case "auth/too-many-requests":
    case "auth/quota-exceeded":
      return "Too many attempts from this device. Please wait a while and try again, or message us on WhatsApp.";
    case "auth/invalid-verification-code":
      return "Incorrect code. Please check and try again.";
    case "auth/code-expired":
    case "auth/session-expired":
      return "That code has expired. Tap “Resend code”.";
    case "auth/captcha-check-failed":
    case "auth/internal-error":
      return "Security check failed. Please refresh the page and try again.";
    case "auth/network-request-failed":
      return "Network problem. Check your connection and try again.";
    case "auth/operation-not-allowed":
    case "auth/billing-not-enabled":
      return "SMS login isn't switched on yet. Please message us on WhatsApp to book.";
    default:
      return "Could not send or check the code right now. Please try again.";
  }
}
