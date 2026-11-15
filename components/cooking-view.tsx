"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { formatQuantity } from "@/lib/quantity";
import type { Recipe } from "@/lib/types";
import { totalTime } from "./recipe-grid";

export function CookingView({ recipe }: { recipe: Recipe }) {
  const base = recipe.servings && recipe.servings > 0 ? recipe.servings : null;
  const [servings, setServings] = useState(base ?? 1);
  const factor = base ? servings / base : servings;
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [doneSteps, setDoneSteps] = useState<Set<number>>(new Set());

  const step = servings < 2 ? 0.5 : 1;
  const toggle = (set: Set<number>, i: number) => {
    const next = new Set(set);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    return next;
  };

  return (
    <article>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <h1 className="font-display text-4xl font-semibold leading-tight md:text-5xl">
            {recipe.title}
          </h1>
          {recipe.description && <p className="mt-3 text-lg text-muted">{recipe.description}</p>}
          <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm font-semibold text-muted">
            {recipe.prepMinutes ? <span>Prep {recipe.prepMinutes} min</span> : null}
            {recipe.cookMinutes ? <span>Cook {recipe.cookMinutes} min</span> : null}
            {totalTime(recipe.prepMinutes, recipe.cookMinutes) && recipe.prepMinutes && recipe.cookMinutes ? (
              <span>Total {totalTime(recipe.prepMinutes, recipe.cookMinutes)}</span>
            ) : null}
            {recipe.sourceUrl && (
              <a href={recipe.sourceUrl} target="_blank" rel="noreferrer" className="text-accent underline">
                {hostname(recipe.sourceUrl)}
              </a>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <WakeLockToggle />
          <Link href={`/recipes/${recipe.id}/edit`} className="btn-ghost">Edit</Link>
        </div>
      </div>

      <div className="mt-8 grid gap-8 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="md:sticky md:top-24 md:self-start">
          <div className="rounded-2xl border border-line bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-2xl font-semibold">Ingredients</h2>
              {recipe.ingredients.length > 0 && (
                <div className="flex items-center gap-1 rounded-full bg-accent-soft p-1">
                  <StepButton label="Fewer servings" onClick={() => setServings((s) => Math.max(step, round(s - step)))}>
                    −
                  </StepButton>
                  <div className="min-w-20 text-center leading-tight">
                    <div className="text-xl font-bold tabular-nums">{servings}</div>
                    <div className="text-xs text-muted">{base ? recipe.servingsLabel : "× batch"}</div>
                  </div>
                  <StepButton label="More servings" onClick={() => setServings((s) => round(s + (s < 2 ? 0.5 : 1)))}>
                    +
                  </StepButton>
                </div>
              )}
            </div>
            {base && servings !== base && (
              <button onClick={() => setServings(base)} className="mt-2 text-sm font-semibold text-accent">
                Reset to original {base} {recipe.servingsLabel}
              </button>
            )}
            <ul className="mt-4">
              {recipe.ingredients.map((ing, i) =>
                ing.isHeading ? (
                  <li key={i} className="mt-4 mb-1 text-sm font-bold uppercase tracking-wide text-muted">
                    {ing.name}
                  </li>
                ) : (
                  <li key={i}>
                    <button
                      onClick={() => setCheckedIngredients((s) => toggle(s, i))}
                      className={`flex w-full items-start gap-3 rounded-lg py-2.5 text-left text-lg ${
                        checkedIngredients.has(i) ? "text-done line-through" : ""
                      }`}
                    >
                      <Check on={checkedIngredients.has(i)} />
                      <span>
                        {ing.quantity !== null && (
                          <strong className="font-bold">
                            {formatQuantity(ing.quantity, ing.quantityMax, ing.unit, factor)}
                            {ing.unit ? ` ${ing.unit}` : ""}{" "}
                          </strong>
                        )}
                        {ing.name}
                        {ing.note && <span className="text-muted">, {ing.note}</span>}
                      </span>
                    </button>
                  </li>
                ),
              )}
            </ul>
          </div>
        </section>

        <section>
          <h2 className="font-display text-2xl font-semibold">Method</h2>
          <ol className="mt-4 space-y-3">
            {recipe.steps.map((s, i) => (
              <li key={i}>
                <button
                  onClick={() => setDoneSteps((d) => toggle(d, i))}
                  className={`flex w-full gap-4 rounded-2xl border p-5 text-left text-lg leading-relaxed transition ${
                    doneSteps.has(i) ? "border-line bg-transparent text-done" : "border-line bg-card"
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-bold ${
                      doneSteps.has(i) ? "bg-line text-muted" : "bg-accent text-accent-ink"
                    }`}
                  >
                    {doneSteps.has(i) ? "✓" : i + 1}
                  </span>
                  <span>{s}</span>
                </button>
              </li>
            ))}
          </ol>
          {recipe.notes && (
            <div className="mt-8 rounded-2xl bg-accent-soft p-5">
              <h3 className="font-display text-xl font-semibold">Notes</h3>
              <p className="mt-2 whitespace-pre-line text-lg">{recipe.notes}</p>
            </div>
          )}
          {recipe.tags.length > 0 && (
            <p className="mt-6 flex flex-wrap gap-2">
              {recipe.tags.map((t) => (
                <span key={t} className="rounded-full border border-line px-3 py-1 text-sm text-muted">
                  {t}
                </span>
              ))}
            </p>
          )}
        </section>
      </div>
    </article>
  );
}

function round(n: number) {
  return Math.round(n * 2) / 2;
}

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Source";
  }
}

function StepButton(props: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      aria-label={props.label}
      onClick={props.onClick}
      className="flex h-12 w-12 items-center justify-center rounded-full bg-card text-2xl font-bold text-accent shadow-sm active:scale-95"
    >
      {props.children}
    </button>
  );
}

function Check({ on }: { on: boolean }) {
  return (
    <span
      className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 text-sm ${
        on ? "border-done bg-done text-card" : "border-line"
      }`}
    >
      {on ? "✓" : ""}
    </span>
  );
}

/** Keeps the iPad screen from dimming while cooking (Screen Wake Lock API). */
function WakeLockToggle() {
  const supported = useSyncExternalStore(
    noopSubscribe,
    () => "wakeLock" in navigator,
    () => false,
  );
  const [on, setOn] = useState(false);
  const lock = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!on) return;
    let cancelled = false;
    const acquire = async () => {
      try {
        lock.current = await navigator.wakeLock.request("screen");
      } catch {
        if (!cancelled) setOn(false);
      }
    };
    acquire();
    // The lock is released when the tab is hidden; take it again on return.
    const onVisible = () => document.visibilityState === "visible" && acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      lock.current?.release();
      lock.current = null;
    };
  }, [on]);

  if (!supported) return null;
  return (
    <button onClick={() => setOn(!on)} className={on ? "btn-primary" : "btn-ghost"}>
      {on ? "☀︎ Screen stays on" : "☀︎ Keep screen on"}
    </button>
  );
}

const noopSubscribe = () => () => {};
