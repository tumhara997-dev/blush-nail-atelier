"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ConfirmationResult, RecaptchaVerifier } from "firebase/auth";
import { confirmFirebaseLogin, confirmOtp, requestOtp, saveName } from "@/actions/auth";
import { firebaseEnabled, firebaseErrorMessage, loadFirebaseAuth } from "@/lib/firebase-client";
import { normalizeIndianMobile } from "@/lib/phone";

type Props = {
  /** Called after a successful login instead of navigating (used inside the booking flow). */
  onDone?: () => void;
  /** Where to go after login when onDone isn't given. Defaults to the user's home (account or admin). */
  next?: string;
};

export function LoginForm({ onDone, next }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "code" | "name">("phone");
  const [phone, setPhone] = useState("");
  const [normalized, setNormalized] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [consent, setConsent] = useState(false);
  const [devCode, setDevCode] = useState<string>();
  const [staging, setStaging] = useState(false);
  const [error, setError] = useState<string>();
  const [home, setHome] = useState("/account");
  const [pending, start] = useTransition();

  const finish = (dest: string) => {
    if (onDone) onDone();
    else {
      router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : dest);
      router.refresh();
    }
  };

  // ── Firebase Phone Auth (when configured): Google sends the SMS and checks the code ──
  const recaptchaHost = useRef<HTMLDivElement>(null);
  const verifierRef = useRef<RecaptchaVerifier | null>(null);
  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const idTokenRef = useRef<string | null>(null);

  const sendWithFirebase = async (e164: string) => {
    const { auth, mod } = await loadFirebaseAuth();
    // Fresh invisible reCAPTCHA each time (a used one can't be reused).
    verifierRef.current?.clear();
    const el = document.createElement("div");
    recaptchaHost.current?.replaceChildren(el);
    verifierRef.current = new mod.RecaptchaVerifier(auth, el, { size: "invisible" });
    confirmationRef.current = await mod.signInWithPhoneNumber(auth, e164, verifierRef.current);
    idTokenRef.current = null;
  };

  const send = () =>
    start(async () => {
      setError(undefined);
      if (firebaseEnabled) {
        const e164 = normalizeIndianMobile(phone);
        if (!e164) return setError("Please enter a valid 10-digit Indian mobile number.");
        try {
          await sendWithFirebase(e164);
        } catch (err) {
          return setError(firebaseErrorMessage(err));
        }
        setNormalized(e164);
        setStep("code");
        return;
      }
      const res = await requestOtp(phone);
      if (!res.ok) return setError(res.error);
      setNormalized(res.phone!);
      setDevCode(res.devCode);
      setStaging(!!res.staging);
      setStep("code");
    });

  const verify = () =>
    start(async () => {
      setError(undefined);
      let res;
      if (firebaseEnabled) {
        // Confirm with Google once; keep the token so a consent retry doesn't need a new SMS.
        if (!idTokenRef.current) {
          if (!confirmationRef.current) return setError("Please request a code first.");
          try {
            const cred = await confirmationRef.current.confirm(code);
            idTokenRef.current = await cred.user.getIdToken();
          } catch (err) {
            return setError(firebaseErrorMessage(err));
          }
        }
        res = await confirmFirebaseLogin(idTokenRef.current, consent);
        if (res.ok) {
          idTokenRef.current = null;
          // Our own session cookie is set; Firebase's browser session isn't needed.
          loadFirebaseAuth().then(({ auth, mod }) => mod.signOut(auth)).catch(() => {});
        }
      } else {
        res = await confirmOtp(normalized, code, consent);
      }
      if (!res.ok) return setError(res.error);
      setHome(res.home ?? "/account");
      if (res.needsName) setStep("name");
      else finish(res.home ?? "/account");
    });

  const submitName = () =>
    start(async () => {
      setError(undefined);
      const res = await saveName(name);
      if (!res.ok) return setError(res.error);
      finish(home);
    });

  return (
    <div className="space-y-3">
      {step === "phone" && (
        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="space-y-3">
          <div>
            <label htmlFor="login-phone" className="label">Mobile number</label>
            <div className="flex items-center gap-2">
              <span className="rounded-xl border border-line bg-pale px-3 py-2.5 text-sm text-muted">+91</span>
              <input id="login-phone" className="input" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="98123 45678" value={phone} onChange={(e) => setPhone(e.target.value)} required autoFocus />
            </div>
          </div>
          <p className="text-xs text-muted">We&apos;ll send a 6-digit code by SMS. No password needed.</p>
          <button className="btn-primary w-full" disabled={pending}>{pending ? "Sending…" : "Send code"}</button>
        </form>
      )}

      {step === "code" && (
        <form onSubmit={(e) => { e.preventDefault(); verify(); }} className="space-y-3">
          <p className="text-sm text-muted">
            {staging ? <>Enter the 6-digit access code for <b className="text-ink">{normalized}</b>. (Preview site — SMS codes are switched on at launch.)</> : <>Code sent to <b className="text-ink">{normalized}</b>.</>}{" "}
            <button type="button" className="font-bold text-rose underline" onClick={() => { setStep("phone"); setCode(""); setError(undefined); }}>Change</button>
          </p>
          {devCode && (
            <p className="rounded-xl border border-dashed border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Dev mode (no SMS provider configured): your code is <b className="font-mono text-sm">{devCode}</b>
            </p>
          )}
          <div>
            <label htmlFor="login-code" className="label">6-digit code</label>
            <input id="login-code" className="input text-center font-mono text-lg tracking-[8px]" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} required autoFocus />
          </div>
          <label className="flex items-start gap-2 text-xs text-muted">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 accent-pink" />
            <span>
              I agree to the <Link href="/policies/privacy" target="_blank" className="underline">privacy policy</Link> and to receive appointment messages on WhatsApp/SMS. (Required for new accounts.)
            </span>
          </label>
          <button className="btn-primary w-full" disabled={pending || code.length !== 6}>{pending ? "Checking…" : "Verify & continue"}</button>
          <button type="button" className="btn-ghost btn-sm w-full" disabled={pending} onClick={send}>Resend code</button>
        </form>
      )}

      {step === "name" && (
        <form onSubmit={(e) => { e.preventDefault(); submitName(); }} className="space-y-3">
          <div>
            <label htmlFor="login-name" className="label">What should we call you?</label>
            <input id="login-name" className="input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          </div>
          <button className="btn-primary w-full" disabled={pending}>{pending ? "Saving…" : "Continue"}</button>
        </form>
      )}

      {error && <p className="error-box" role="alert">{error}</p>}
      {/* Invisible reCAPTCHA mounts here (Firebase); shows the small "protected by reCAPTCHA" badge only when used. */}
      <div ref={recaptchaHost} />
      {firebaseEnabled && step === "phone" && (
        <p className="text-[11px] leading-4 text-muted/80">
          Protected by reCAPTCHA — Google&apos;s <a href="https://policies.google.com/privacy" target="_blank" rel="noopener" className="underline">Privacy Policy</a> and{" "}
          <a href="https://policies.google.com/terms" target="_blank" rel="noopener" className="underline">Terms</a> apply.
        </p>
      )}
    </div>
  );
}
