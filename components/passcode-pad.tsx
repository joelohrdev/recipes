"use client";

import { useActionState, useRef, useState } from "react";
import { loginAction } from "@/app/actions";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

export function PasscodePad({ next }: { next: string }) {
  const [state, action, pending] = useActionState(loginAction, null);
  const [code, setCode] = useState("");
  const form = useRef<HTMLFormElement>(null);

  const press = (key: string) => {
    if (key === "⌫") setCode((c) => c.slice(0, -1));
    else if (key) setCode((c) => (c.length < 12 ? c + key : c));
  };

  return (
    <form ref={form} action={action} className="mt-8">
      <input type="hidden" name="next" value={next} />
      {/* Also typeable, for passcodes with letters or a hardware keyboard. */}
      <input
        name="passcode"
        type="password"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        autoComplete="current-password"
        inputMode="none"
        aria-label="Passcode"
        className="field h-16 text-center text-3xl tracking-[0.4em]"
      />
      <p className="mt-3 h-6 text-sm font-semibold text-accent" role="alert">
        {state?.error}
      </p>
      <div className="mt-2 grid grid-cols-3 gap-3">
        {KEYS.map((k, i) =>
          k ? (
            <button
              key={i}
              type="button"
              onClick={() => press(k)}
              className="h-20 rounded-2xl border border-line bg-card text-3xl font-semibold active:bg-accent-soft"
            >
              {k}
            </button>
          ) : (
            <span key={i} />
          ),
        )}
      </div>
      <button disabled={!code || pending} className="btn-primary mt-5 h-14 w-full text-lg">
        {pending ? "Checking…" : "Unlock"}
      </button>
    </form>
  );
}
