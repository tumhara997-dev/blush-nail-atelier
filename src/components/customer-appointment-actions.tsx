"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelMyAppointment, respondToQuote } from "@/actions/account";

export function CustomerAppointmentActions({ refCode, canCancel, isQuoted }: { refCode: string; canCancel: boolean; isQuoted: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok?: boolean; text?: string }>({});
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState("");

  const run = (fn: () => Promise<{ ok?: boolean; error?: string; message?: string }>) =>
    start(async () => {
      const r = await fn();
      setMsg({ ok: r.ok, text: r.error ?? r.message });
      if (r.ok) {
        setConfirming(false);
        router.refresh();
      }
    });

  if (!canCancel && !isQuoted) return msg.text ? <p className={msg.ok ? "ok-box" : "error-box"}>{msg.text}</p> : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {isQuoted && (
          <>
            <button className="btn-primary" disabled={pending} onClick={() => run(() => respondToQuote(refCode, true))}>Accept quote & confirm</button>
            <button className="btn-outline" disabled={pending} onClick={() => run(() => respondToQuote(refCode, false))}>Decline</button>
          </>
        )}
        {canCancel && !confirming && !isQuoted && (
          <button className="btn-danger" onClick={() => setConfirming(true)}>Cancel appointment</button>
        )}
      </div>
      {confirming && (
        <div className="card space-y-3 p-4">
          <label htmlFor="reason" className="label">Reason (optional)</label>
          <input id="reason" className="input" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />
          <div className="flex gap-2">
            <button className="btn-danger" disabled={pending} onClick={() => run(() => cancelMyAppointment(refCode, reason))}>{pending ? "Cancelling…" : "Yes, cancel it"}</button>
            <button className="btn-ghost" onClick={() => setConfirming(false)}>Keep it</button>
          </div>
        </div>
      )}
      {msg.text && <p className={msg.ok ? "ok-box" : "error-box"} role="status">{msg.text}</p>}
    </div>
  );
}
