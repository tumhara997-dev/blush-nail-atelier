import { beforeAll, describe, expect, it } from "vitest";
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from "jose";
import { verifyFirebasePhoneToken } from "@/server/firebase";

// Locally signed stand-ins for Google's tokens — same claims/checks as real Firebase ID tokens.
const PROJECT = "blush-test";
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = PROJECT;

let sign: (claims: Record<string, unknown>, opts?: { aud?: string; iss?: string; iatOffset?: number; key?: "good" | "evil" }) => Promise<string>;
let keys: ReturnType<typeof createLocalJWKSet>;

beforeAll(async () => {
  const good = await generateKeyPair("RS256");
  const evil = await generateKeyPair("RS256");
  const jwk = { ...(await exportJWK(good.publicKey)), kid: "k1", alg: "RS256" };
  keys = createLocalJWKSet({ keys: [jwk] });
  sign = (claims, o = {}) => {
    const now = Math.floor(Date.now() / 1000) + (o.iatOffset ?? 0);
    return new SignJWT(claims)
      .setProtectedHeader({ alg: "RS256", kid: "k1" })
      .setIssuer(o.iss ?? `https://securetoken.google.com/${PROJECT}`)
      .setAudience(o.aud ?? PROJECT)
      .setSubject("uid-123")
      .setIssuedAt(now)
      .setExpirationTime(now + 3600)
      .sign(o.key === "evil" ? evil.privateKey : good.privateKey);
  };
});

const phoneClaims = () => ({ phone_number: "+919812345678", auth_time: Math.floor(Date.now() / 1000), firebase: { sign_in_provider: "phone" } });

describe("Firebase phone token verification", () => {
  it("accepts a fresh phone sign-in token for our project", async () => {
    expect(await verifyFirebasePhoneToken(await sign(phoneClaims()), keys)).toBe("+919812345678");
  });
  it("rejects a token for another Firebase project", async () => {
    expect(await verifyFirebasePhoneToken(await sign(phoneClaims(), { aud: "someone-else", iss: "https://securetoken.google.com/someone-else" }), keys)).toBeNull();
  });
  it("rejects a token signed with a key that isn't Google's", async () => {
    expect(await verifyFirebasePhoneToken(await sign(phoneClaims(), { key: "evil" }), keys)).toBeNull();
  });
  it("rejects non-phone sign-ins (e.g. anonymous/email)", async () => {
    expect(await verifyFirebasePhoneToken(await sign({ ...phoneClaims(), firebase: { sign_in_provider: "anonymous" } }), keys)).toBeNull();
  });
  it("rejects an old login replayed later", async () => {
    expect(await verifyFirebasePhoneToken(await sign({ ...phoneClaims(), auth_time: Math.floor(Date.now() / 1000) - 3600 }), keys)).toBeNull();
    expect(await verifyFirebasePhoneToken(await sign(phoneClaims(), { iatOffset: -1800 }), keys)).toBeNull();
  });
  it("rejects garbage", async () => {
    expect(await verifyFirebasePhoneToken("not-a-token", keys)).toBeNull();
    expect(await verifyFirebasePhoneToken("", keys)).toBeNull();
  });
});
