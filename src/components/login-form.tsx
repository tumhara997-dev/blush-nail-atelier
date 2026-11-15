"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmOtp, requestOtp, saveName } from "@/actions/auth";

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

  const send = () =>
    start(async () => {
      setError(undefined);
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
      const res = await confirmOtp(normalized, code, consent);
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
    </div>
  );
}
