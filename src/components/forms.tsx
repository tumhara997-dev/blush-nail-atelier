"use client";

import { createContext, startTransition, useActionState, useContext, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

type State = { ok?: boolean; error?: string; message?: string };
type Action = (prev: State, form: FormData) => Promise<State>;

const PendingContext = createContext<boolean | null>(null);

/**
 * Form bound to a server action that returns { ok, error, message }; shows the result inline.
 * Submits via onSubmit (not the `action` prop) so React 19 doesn't clear the inputs —
 * on an error the user keeps what they typed. Pass `resetOnSuccess` to clear after success.
 */
export function ActionForm({ action, children, className, resetOnSuccess }: { action: Action; children: React.ReactNode; className?: string; resetOnSuccess?: boolean }) {
  const [state, run, pending] = useActionState<State, FormData>(action, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <PendingContext.Provider value={pending}>
      <form
        ref={ref}
        className={className}
        onSubmit={(e) => {
          e.preventDefault();
          const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
          const data = new FormData(e.currentTarget, submitter);
          startTransition(() => run(data));
        }}
      >
        {children}
        {state.error && <p className="error-box mt-3 basis-full" role="alert">{state.error}</p>}
        {state.ok && state.message && <p className="ok-box mt-3 basis-full" role="status">{state.message}</p>}
      </form>
    </PendingContext.Provider>
  );
}

export function Submit({ children, className = "btn-primary btn-sm", confirm, name, value }: { children: React.ReactNode; className?: string; confirm?: string; name?: string; value?: string }) {
  const ctx = useContext(PendingContext);
  const status = useFormStatus(); // used when inside a plain <form action={serverAction}>
  const pending = ctx ?? status.pending;
  return (
    <button name={name} value={value} className={className} disabled={pending} onClick={(e) => { if (confirm && !window.confirm(confirm)) e.preventDefault(); }}>
      {pending ? "Saving…" : children}
    </button>
  );
}
