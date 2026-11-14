"use client";

import { adminReschedule, adminTransition } from "@/actions/admin";
import type { AppointmentStatus } from "@/lib/appointment-status";
import { paiseToRupeesInput } from "@/lib/money";
import { ActionForm, Submit } from "@/components/forms";

type Props = {
  id: string;
  status: AppointmentStatus;
  suggestedTotal: number | null;
  staff: { id: string; name: string }[];
  current: { date: string; time: string; staffId: string | null };
};

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-4">
      <h3 className="mb-3 text-sm font-bold text-plum">{title}</h3>
      {children}
    </div>
  );
}

export function AdminAppointmentActions({ id, status, suggestedTotal, staff, current }: Props) {
  const hidden = (to: string) => (
    <>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="to" value={to} />
    </>
  );
  const upcoming = ["REQUESTED", "QUOTED", "CONFIRMED"].includes(status);

  return (
    <div className="space-y-4">
      {(status === "REQUESTED" || status === "QUOTED") && (
        <Box title={status === "QUOTED" ? "Update quote" : "Send a quote"}>
          <ActionForm action={adminTransition} className="space-y-2">
            {hidden("QUOTED")}
            <label className="label" htmlFor="q-total">Price (₹)</label>
            <input id="q-total" name="quotedTotal" inputMode="decimal" className="input" defaultValue={paiseToRupeesInput(suggestedTotal)} required />
            <label className="label" htmlFor="q-note">Note to customer (optional)</label>
            <textarea id="q-note" name="quoteNote" rows={2} className="input" placeholder="e.g. includes chrome finish on 10 nails" />
            <Submit>Send quote on WhatsApp</Submit>
          </ActionForm>
        </Box>
      )}

      {status === "REQUESTED" && (
        <Box title="Confirm without quote">
          <ActionForm action={adminTransition}>
            {hidden("CONFIRMED")}
            <p className="mb-2 text-xs text-muted">Price agreed already (e.g. on WhatsApp)? Confirm directly.</p>
            <Submit>Confirm booking</Submit>
          </ActionForm>
        </Box>
      )}

      {status === "QUOTED" && (
        <Box title="Customer agreed by phone/WhatsApp?">
          <ActionForm action={adminTransition}>
            {hidden("CONFIRMED")}
            <Submit>Mark as confirmed</Submit>
          </ActionForm>
        </Box>
      )}

      {status === "CONFIRMED" && (
        <Box title="Customer arrived">
          <div className="flex flex-wrap gap-2">
            <ActionForm action={adminTransition}>
              {hidden("CHECKED_IN")}
              <Submit>Check in</Submit>
            </ActionForm>
            <ActionForm action={adminTransition}>
              {hidden("NO_SHOW")}
              <Submit className="btn-danger btn-sm" confirm="Mark as no-show?">No-show</Submit>
            </ActionForm>
          </div>
        </Box>
      )}

      {(status === "CONFIRMED" || status === "CHECKED_IN") && (
        <Box title="Complete">
          <ActionForm action={adminTransition} className="space-y-2">
            {hidden("COMPLETED")}
            <label className="label" htmlFor="f-total">Final amount paid (₹)</label>
            <input id="f-total" name="finalTotal" inputMode="decimal" className="input" defaultValue={paiseToRupeesInput(suggestedTotal)} />
            <Submit>Mark completed</Submit>
          </ActionForm>
        </Box>
      )}

      {upcoming && (
        <Box title="Move appointment">
          <ActionForm action={adminReschedule} className="grid grid-cols-2 gap-2">
            <input type="hidden" name="id" value={id} />
            <div>
              <label className="label" htmlFor="r-date">Date</label>
              <input id="r-date" type="date" name="date" defaultValue={current.date} className="input" required />
            </div>
            <div>
              <label className="label" htmlFor="r-time">Time</label>
              <input id="r-time" type="time" name="time" step={900} defaultValue={current.time} className="input" required />
            </div>
            <div className="col-span-2">
              <label className="label" htmlFor="r-staff">Artist</label>
              <select id="r-staff" name="staffId" defaultValue={current.staffId ?? ""} className="input">
                <option value="">Any free artist</option>
                {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <Submit className="btn-outline btn-sm">Move & notify customer</Submit>
            </div>
          </ActionForm>
          <p className="mt-2 text-xs text-muted">Any quarter hour within opening hours that doesn&apos;t clash with another booking.</p>
        </Box>
      )}

      {(upcoming || status === "CHECKED_IN") && (
        <Box title="Cancel">
          <ActionForm action={adminTransition} className="space-y-2">
            {hidden("CANCELLED")}
            <input name="cancelReason" className="input" placeholder="Reason (sent to customer)" />
            <Submit className="btn-danger btn-sm" confirm="Cancel this appointment and notify the customer?">Cancel appointment</Submit>
          </ActionForm>
        </Box>
      )}
    </div>
  );
}
