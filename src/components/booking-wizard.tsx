"use client";
import { mediaUrl } from "@/lib/media-url";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBooking } from "@/actions/booking";
import { saveName } from "@/actions/auth";
import { estimate } from "@/lib/pricing";
import { formatPaise, priceLabel } from "@/lib/money";
import { formatHm } from "@/lib/time";
import { LoginForm } from "./login-form";

type Variant = { id: string; name: string; price: number; durationMin: number };
type AddOn = Variant;
type Service = {
  id: string; name: string; summary: string; emoji: string | null;
  priceType: "FIXED" | "FROM" | "ON_ENQUIRY"; basePrice: number | null; durationMin: number;
  bookingMode: "INSTANT" | "REQUEST"; variants: Variant[]; addOns: AddOn[];
};
export type WizardCategory = { id: string; name: string; services: Service[] };
type Day = { date: string; label: string; closed: boolean };

type Props = {
  categories: WizardCategory[];
  days: Day[];
  initialServiceId?: string;
  initialNote?: string;
  initialLook?: { id: string; caption: string; mediaId: string } | null;
  user: { name: string | null } | null;
  cancelWindowHours: number;
};

function Step({ n, title, done, children }: { n: number; title: string; done?: boolean; children: React.ReactNode }) {
  return (
    <section className="card p-5 sm:p-7" aria-labelledby={`step-${n}`}>
      <h2 id={`step-${n}`} className="mb-5 flex items-center gap-3 font-serif text-[26px] font-medium text-plum">
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border font-sans text-[12px] ${done ? "border-plum bg-plum text-cream" : "border-gold text-gold"}`}>{done ? "✓" : n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export function BookingWizard({ categories, days, initialServiceId, initialNote, initialLook, user, cancelWindowHours }: Props) {
  const router = useRouter();
  const all = useMemo(() => categories.flatMap((c) => c.services), [categories]);
  const [serviceId, setServiceId] = useState(all.some((s) => s.id === initialServiceId) ? initialServiceId! : "");
  const [variantId, setVariantId] = useState("");
  const [addOnIds, setAddOnIds] = useState<string[]>([]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [slots, setSlots] = useState<{ loading: boolean; times: string[]; closed: boolean; error?: string }>({ loading: false, times: [], closed: false });
  const [look, setLook] = useState(initialLook ?? null);
  const [note, setNote] = useState(initialNote ?? (initialLook ? `Inspired by “${initialLook.caption}” from your gallery. ` : ""));
  const [files, setFiles] = useState<File[]>([]);
  const [loggedIn, setLoggedIn] = useState(!!user);
  const [needsName, setNeedsName] = useState(!!user && !user.name);
  const [name, setName] = useState("");
  const [showAllDays, setShowAllDays] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const dateRef = useRef<HTMLDivElement>(null);

  const service = all.find((s) => s.id === serviceId);
  const variant = service?.variants.find((v) => v.id === variantId);
  const addOns = service?.addOns.filter((a) => addOnIds.includes(a.id)) ?? [];
  const optionsDone = !!service && (service.variants.length === 0 || !!variant);
  const est = service ? estimate(service, variant, addOns) : null;

  // Pick a service → reset options.
  const chooseService = (id: string) => {
    setServiceId(id);
    setVariantId("");
    setAddOnIds([]);
    setTime("");
    setError(undefined);
  };

  // When options are complete, default to the first open day.
  useEffect(() => {
    if (optionsDone && !date) setDate(days.find((d) => !d.closed)?.date ?? "");
  }, [optionsDone, date, days]);

  // Load slots whenever the selection or date changes.
  const key = `${serviceId}|${variantId}|${[...addOnIds].sort().join(",")}|${date}`;
  useEffect(() => {
    if (!optionsDone || !date) return;
    const ctrl = new AbortController();
    setTime("");
    setSlots({ loading: true, times: [], closed: false });
    const qs = new URLSearchParams({ serviceId, date });
    if (variantId) qs.set("variantId", variantId);
    if (addOnIds.length) qs.set("addOnIds", addOnIds.join(","));
    fetch(`/api/availability?${qs}`, { signal: ctrl.signal })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "Could not load times");
        setSlots({ loading: false, times: j.slots, closed: j.closed });
      })
      .catch((e) => {
        if (e.name !== "AbortError") setSlots({ loading: false, times: [], closed: false, error: e.message });
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, optionsDone]);

  const visibleDays = showAllDays ? days : days.slice(0, 14);

  const submit = () =>
    start(async () => {
      setError(undefined);
      if (needsName) {
        const r = await saveName(name);
        if (!r.ok) return setError(r.error);
        setNeedsName(false);
      }
      const fd = new FormData();
      fd.set("serviceId", serviceId);
      if (variantId) fd.set("variantId", variantId);
      addOnIds.forEach((id) => fd.append("addOnIds", id));
      fd.set("date", date);
      fd.set("time", time);
      if (note.trim()) fd.set("note", note.trim());
      if (look) fd.set("lookId", look.id);
      files.forEach((f) => fd.append("photos", f));
      const res = await createBooking(fd);
      if (!res.ok) {
        setError(res.error);
        if (res.error.includes("taken")) setSlots((s) => ({ ...s, times: s.times.filter((t) => t !== time) }));
        return;
      }
      router.push(`/book/confirmed/${res.ref}`);
    });

  const isRequest = service?.bookingMode === "REQUEST";
  const skip = service && (service.variants.length > 0 || service.addOns.length > 0) ? 0 : 1; // no "Options" step

  return (
    <div className="space-y-4">
      {look && (
        <div className="card flex items-center gap-4 p-3 pr-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mediaUrl(look.mediaId)} alt="" className="h-20 w-16 rounded-xl object-cover" />
          <div className="flex-1">
            <div className="text-[11px] uppercase tracking-[0.2em] text-gold">Your reference look</div>
            <div className="font-serif text-xl text-plum">{look.caption}</div>
            <div className="text-xs text-muted">We&apos;ll attach this photo to your booking.</div>
          </div>
          <button type="button" className="text-xs text-muted underline hover:text-rose" onClick={() => setLook(null)}>Remove</button>
        </div>
      )}
      <Step n={1} title="Choose a service" done={!!service}>
        <div className="space-y-5">
          {categories.map((c) => (
            <div key={c.id}>
              <div className="mb-3 text-[11px] uppercase tracking-[0.24em] text-gold">{c.name}</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {c.services.map((s) => {
                  const on = s.id === serviceId;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => chooseService(s.id)}
                      className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-left transition ${on ? "border-plum bg-pale" : "border-line bg-white hover:border-plum/30"}`}
                    >
                      <span className={`mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full border ${on ? "border-plum bg-plum shadow-[inset_0_0_0_2px_#fff]" : "border-muted/50"}`} aria-hidden />
                      <span className="flex-1">
                        <span className="block font-serif text-[19px] leading-tight text-plum">{s.name}</span>
                        <span className="mt-0.5 block text-xs text-muted">{priceLabel(s)} · ~{s.durationMin} min</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Step>

      {service && (service.variants.length > 0 || service.addOns.length > 0) && (
        <Step n={2} title="Options" done={optionsDone}>
          {service.variants.length > 0 && (
            <fieldset className="mb-4">
              <legend className="label">Length / size *</legend>
              <div className="flex flex-wrap gap-2">
                {service.variants.map((v) => (
                  <label key={v.id} className={`cursor-pointer rounded-full border px-4 py-2 text-sm ${variantId === v.id ? "border-pink bg-pink text-white" : "border-line bg-white hover:border-pink"}`}>
                    <input type="radio" name="variant" value={v.id} className="sr-only" checked={variantId === v.id} onChange={() => setVariantId(v.id)} />
                    {v.name} · {formatPaise(v.price)}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          {service.addOns.length > 0 && (
            <fieldset>
              <legend className="label">Add-ons (optional)</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {service.addOns.map((a) => (
                  <label key={a.id} className="flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-sm">
                    <input type="checkbox" className="accent-pink" checked={addOnIds.includes(a.id)} onChange={(e) => setAddOnIds((ids) => (e.target.checked ? [...ids, a.id] : ids.filter((x) => x !== a.id)))} />
                    <span className="flex-1">{a.name}</span>
                    <span className="text-xs text-muted">+{formatPaise(a.price)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
        </Step>
      )}

      {optionsDone && (
        <Step n={3 - skip} title="Pick a date & time" done={!!time}>
          <div ref={dateRef} className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2" role="listbox" aria-label="Date">
            {visibleDays.map((d) => {
              const [wd, ...rest] = d.label.split(" ");
              const on = d.date === date;
              return (
                <button
                  key={d.date}
                  type="button"
                  role="option"
                  aria-selected={on}
                  disabled={d.closed}
                  onClick={() => setDate(d.date)}
                  className={`flex min-w-[64px] flex-col items-center rounded-xl border px-2 py-2 text-xs transition disabled:cursor-not-allowed disabled:opacity-40 ${on ? "border-pink bg-pink text-white" : "border-line bg-white hover:border-pink"}`}
                >
                  <span className="font-bold">{wd.replace(",", "")}</span>
                  <span>{rest.join(" ")}</span>
                  {d.closed && <span className="text-[10px]">Closed</span>}
                </button>
              );
            })}
            {!showAllDays && days.length > 14 && (
              <button type="button" onClick={() => setShowAllDays(true)} className="min-w-[80px] rounded-xl border border-dashed border-line px-2 text-xs text-rose">
                More dates →
              </button>
            )}
          </div>

          <div className="mt-3" aria-live="polite">
            {slots.loading && <p className="text-sm text-muted">Checking availability…</p>}
            {slots.error && <p className="error-box">{slots.error}</p>}
            {!slots.loading && !slots.error && date && slots.times.length === 0 && (
              <p className="text-sm text-muted">{slots.closed ? "We're closed on this day." : "No free times on this day — please try another date."}</p>
            )}
            {!slots.loading && slots.times.length > 0 && (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {slots.times.map((t) => (
                  <button key={t} type="button" aria-pressed={t === time} onClick={() => setTime(t)} className={`rounded-lg border px-2 py-2 text-sm font-bold ${t === time ? "border-pink bg-pink text-white" : "border-line bg-white text-rose hover:border-pink"}`}>
                    {formatHm(t)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </Step>
      )}

      {time && (
        <Step n={4 - skip} title={isRequest ? "Tell us about your design" : "Anything we should know?"}>
          <div className="space-y-3">
            <div>
              <label htmlFor="note" className="label">{isRequest ? "Describe the design, shape and length *" : "Notes (optional)"}</label>
              <textarea id="note" rows={3} className="input" maxLength={1500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. almond shape, medium length, nude base with gold foil" />
            </div>
            <div>
              <label htmlFor="photos" className="label">Inspiration photos (up to 3, JPG/PNG/WebP)</label>
              <input
                id="photos"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-pale file:px-4 file:py-2 file:text-sm file:font-bold file:text-rose"
                onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 3))}
              />
              {files.length > 0 && <p className="mt-1 text-xs text-muted">{files.map((f) => f.name).join(", ")}</p>}
            </div>
          </div>
        </Step>
      )}

      {time && (
        <Step n={5 - skip} title={loggedIn ? "Review & confirm" : "Log in to confirm"}>
          {!loggedIn ? (
            <div className="max-w-sm">
              <LoginForm onDone={() => { setLoggedIn(true); router.refresh(); }} />
            </div>
          ) : (
            <div className="space-y-4">
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 rounded-xl bg-pale p-4 text-sm">
                <dt className="text-muted">Service</dt>
                <dd className="font-bold text-plum">{service!.name}{variant ? ` (${variant.name})` : ""}</dd>
                {addOns.length > 0 && (<><dt className="text-muted">Add-ons</dt><dd>{addOns.map((a) => a.name).join(", ")}</dd></>)}
                <dt className="text-muted">When</dt>
                <dd>{days.find((d) => d.date === date)?.label}, {formatHm(time)}</dd>
                <dt className="text-muted">Duration</dt>
                <dd>~{est!.durationMin} min</dd>
                <dt className="text-muted">Price</dt>
                <dd>{est!.price != null ? formatPaise(est!.price) : est!.fromPrice != null ? `From ${formatPaise(est!.fromPrice)}` : "We'll send you a quote"}</dd>
              </dl>
              {needsName && (
                <div>
                  <label htmlFor="bk-name" className="label">Your name *</label>
                  <input id="bk-name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
                </div>
              )}
              <p className="text-xs text-muted">
                {isRequest
                  ? "This is a request: we'll review your design and send a price on WhatsApp. Your slot is held meanwhile."
                  : "You'll get a WhatsApp confirmation."}{" "}
                Free cancellation up to {cancelWindowHours}h before. <Link href="/policies/cancellation" target="_blank" className="underline">Policy</Link>
              </p>
              {error && <p className="error-box" role="alert">{error}</p>}
              <button
                type="button"
                className="btn-primary w-full sm:w-auto"
                disabled={pending || (isRequest && note.trim().length < 3) || (needsName && name.trim().length < 2)}
                onClick={submit}
              >
                {pending ? "Booking…" : isRequest ? "Send request" : "Confirm booking"}
              </button>
            </div>
          )}
        </Step>
      )}
    </div>
  );
}
