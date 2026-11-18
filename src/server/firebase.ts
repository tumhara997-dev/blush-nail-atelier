import { createRemoteJWKSet, jwtVerify } from "jose";

/**
 * Firebase Phone Auth: the browser proves the phone number with Google (SMS code + reCAPTCHA) and
 * sends us the resulting Firebase ID token. We verify it against Google's public keys — no Firebase
 * Admin SDK or service-account secret needed — then sign the user in with our own session.
 */
const JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"));

export function firebaseProjectId(): string | null {
  return process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() || null;
}

export function firebaseConfigured(): boolean {
  return Boolean(firebaseProjectId() && process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
}

/** Returns the verified E.164 phone number, or null if the token is invalid/expired/not a phone sign-in. */
export async function verifyFirebasePhoneToken(idToken: string, keys: Parameters<typeof jwtVerify>[1] = JWKS): Promise<string | null> {
  const projectId = firebaseProjectId();
  if (!projectId || !idToken || idToken.length > 4096) return null;
  try {
    const { payload } = await jwtVerify(idToken, keys as typeof JWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
      algorithms: ["RS256"],
      maxTokenAge: "10 minutes", // freshly issued for this login only
    });
    const firebase = payload.firebase as { sign_in_provider?: string } | undefined;
    const phone = payload.phone_number;
    if (firebase?.sign_in_provider !== "phone" || typeof phone !== "string" || !payload.sub) return null;
    // Freshness of the actual authentication, not just the token.
    const authTime = typeof payload.auth_time === "number" ? payload.auth_time : 0;
    if (Date.now() / 1000 - authTime > 10 * 60) return null;
    return phone;
  } catch {
    return null;
  }
}
