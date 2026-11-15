"use client";

import { useActionState, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { loginAction } from "@/app/actions";
import { Backspace } from "./icons";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"];

/**
 * `length` is the passcode's length. Once that many characters are entered the
 * passcode is sent straight away, so there's no Unlock button to tap.
 */
export function PasscodePad({ next, length }: { next: string; length: number | null }) {
  const [state, action, pending] = useActionState(loginAction, null);
  const [code, setCode] = useState("");
  const form = useRef<HTMLFormElement>(null);

  const update = (value: string) => {
    if (length && value.length === length && !pending) {
      // Render the full code into the input, then send the form, then clear the
      // field so a wrong passcode can be retyped from scratch.
      flushSync(() => setCode(value));
      form.current?.requestSubmit();
      setCode("");
    } else {
      setCode(value.slice(0, 12));
    }
  };

  const press = (key: string) => {
    if (key === "back") update(code.slice(0, -1));
    else if (key) update(code + key);
  };

  return (
    <form ref={form} action={action} className="mt-8">
      <input type="hidden" name="next" value={next} />
      {/* Also typeable, for passcodes with letters or a hardware keyboard. */}
      <input
        name="passcode"
        type="password"
        value={code}
        onChange={(e) => update(e.target.value)}
        autoComplete="current-password"
        inputMode="numeric"
        aria-label="Passcode"
        aria-invalid={!!state?.error}
        className="field h-16 text-center text-[2rem] font-bold tracking-[0.5em]"
      />
      <p className="mt-3 min-h-6 font-semibold text-margin" role="alert">
        {state?.error}
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2.5">
        {KEYS.map((k, i) =>
          k === "" ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              type="button"
              onClick={() => press(k)}
              aria-label={k === "back" ? "Delete last digit" : k}
              className="flex h-[4.5rem] items-center justify-center rounded-[10px] border border-line bg-paper text-[1.875rem] font-bold active:bg-cobalt-wash"
            >
              {k === "back" ? <Backspace className="h-7 w-7 text-ink-soft" /> : k}
            </button>
          ),
        )}
      </div>
      {length ? (
        <p className="mt-5 h-14 text-center font-semibold text-ink-soft" aria-live="polite">
          {pending ? "Checking…" : ""}
        </p>
      ) : (
        <button disabled={!code || pending} className="btn-primary mt-5 h-14 w-full text-lg">
          {pending ? "Checking…" : "Unlock"}
        </button>
      )}
    </form>
  );
}
