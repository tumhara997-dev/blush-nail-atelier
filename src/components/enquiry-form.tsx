"use client";

import Link from "next/link";
import { submitEnquiry } from "@/actions/public";
import { ActionForm, Submit } from "./forms";

export function EnquiryForm() {
  return (
    <ActionForm action={submitEnquiry} resetOnSuccess className="grid gap-3">
      <div>
        <label htmlFor="enq-name" className="label">Your name *</label>
        <input id="enq-name" name="name" required autoComplete="name" className="input" />
      </div>
      <div>
        <label htmlFor="enq-phone" className="label">Mobile number *</label>
        <input id="enq-phone" name="phone" required type="tel" inputMode="tel" autoComplete="tel" placeholder="98123 45678" className="input" />
      </div>
      <div>
        <label htmlFor="enq-msg" className="label">Message *</label>
        <textarea id="enq-msg" name="message" required rows={4} className="input" />
      </div>
      <div className="hidden" aria-hidden>
        <label htmlFor="enq-website">Website</label>
        <input id="enq-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <label className="flex items-start gap-2 text-xs text-muted">
        <input type="checkbox" name="consent" required className="mt-0.5 accent-pink" />
        <span>I agree that BLUSH may contact me about this enquiry. <Link href="/policies/privacy" className="underline">Privacy policy</Link></span>
      </label>
      <Submit className="btn-primary">Send enquiry</Submit>
    </ActionForm>
  );
}
