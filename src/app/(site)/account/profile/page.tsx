import { requireUser } from "@/server/auth";
import { ProfileForm } from "@/components/profile-form";
import { deleteMyAccount } from "@/actions/account";
import { formatPhone } from "@/lib/phone";

export const metadata = { title: "Profile" };

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await requireUser("/account/profile");
  const { error } = await searchParams;
  return (
    <div className="space-y-6">
      <div className="card p-5">
        <h2 className="mb-1 font-serif text-xl text-plum">Your details</h2>
        <p className="mb-4 text-sm text-muted">Mobile: {formatPhone(user.phone)} (used to log in)</p>
        <ProfileForm user={{ name: user.name ?? "", email: user.email ?? "", nailPrefs: user.nailPrefs ?? "", allergies: user.allergies ?? "", marketingOptIn: user.marketingOptIn }} />
      </div>

      {user.role === "CUSTOMER" && (
        <details className="card p-5">
          <summary className="cursor-pointer font-bold text-rose-800">Delete my account</summary>
          <p className="mt-3 text-sm text-muted">
            This removes your name, number, email, preferences and photos, and cancels upcoming bookings. Past appointment records are kept anonymously for the salon&apos;s accounts. This cannot be undone.
          </p>
          <form action={deleteMyAccount} className="mt-3 flex flex-wrap items-end gap-2">
            <div>
              <label htmlFor="confirm" className="label">Type DELETE to confirm</label>
              <input id="confirm" name="confirm" className="input" autoComplete="off" />
            </div>
            <button className="btn-danger">Delete account</button>
          </form>
          {error === "confirm" && <p className="error-box mt-3">Please type DELETE to confirm.</p>}
        </details>
      )}
    </div>
  );
}
