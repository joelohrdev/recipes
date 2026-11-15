"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { hostname, minutes, totalTime } from "@/lib/format";
import { formatQuantity } from "@/lib/quantity";
import type { Recipe } from "@/lib/types";
import { DeleteRecipe } from "./delete-recipe";
import { Check, Link as LinkIcon, Minus, Pencil, Plus, Sun } from "./icons";

export function CookingView({ recipe }: { recipe: Recipe }) {
  const base = recipe.servings && recipe.servings > 0 ? recipe.servings : null;
  const [servings, setServings] = useState(base ?? 1);
  const factor = base ? servings / base : servings;
  const [gotIngredients, setGotIngredients] = useState<Set<number>>(new Set());
  const [doneSteps, setDoneSteps] = useState<Set<number>>(new Set());
  const currentStep = recipe.steps.findIndex((_, i) => !doneSteps.has(i));

  const toggle = (set: Set<number>, i: number) => {
    const next = new Set(set);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    return next;
  };

  const facts = [
    recipe.prepMinutes ? { label: "Prep", value: minutes(recipe.prepMinutes) } : null,
    recipe.cookMinutes ? { label: "Cook", value: minutes(recipe.cookMinutes) } : null,
    recipe.prepMinutes && recipe.cookMinutes
      ? { label: "Total", value: totalTime(recipe.prepMinutes, recipe.cookMinutes)! }
      : null,
  ].filter((f) => f !== null);

  return (
    <article>
      <header
        className={`grid items-start gap-6 ${recipe.imageUrl ? "md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]" : ""}`}
      >
        <div>
          <h1 className="max-w-[18ch] text-balance font-slab text-[2.75rem] font-bold leading-[1.05] tracking-tight md:text-[3.5rem]">
            {recipe.title}
          </h1>
          {recipe.description && (
            <p className="mt-4 max-w-[60ch] text-lg text-ink-soft">{recipe.description}</p>
          )}
          {facts.length > 0 && (
            <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3">
              {facts.map((f) => (
                <div key={f.label}>
                  <dt className="text-[0.9375rem] text-ink-soft">{f.label}</dt>
                  <dd className="text-xl font-bold">{f.value}</dd>
                </div>
              ))}
            </dl>
          )}
          <div className="mt-6 flex flex-wrap gap-2">
            <WakeLockToggle />
            <Link href={`/recipes/${recipe.id}/edit`} className="btn-plain">
              <Pencil />
              Edit
            </Link>
            {recipe.sourceUrl && (
              <a href={recipe.sourceUrl} target="_blank" rel="noreferrer" className="btn-quiet">
                <LinkIcon />
                {hostname(recipe.sourceUrl)}
              </a>
            )}
            <DeleteRecipe id={recipe.id} title={recipe.title} />
          </div>
        </div>
        {recipe.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={recipe.imageUrl}
            alt=""
            className="aspect-[4/3] w-full rounded-md object-cover max-md:order-first max-md:aspect-[16/9]"
          />
        )}
      </header>

      <div className="mt-10 grid gap-10 md:grid-cols-2 md:gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
        {/* Ingredients, on a ruled index card */}
        <section className="md:sticky md:top-6 md:self-start" aria-labelledby="ingredients">
          <div className="index-card">
            <div className="index-card__head flex flex-wrap items-center justify-between gap-3 px-5 pb-3 pt-4">
              <h2 id="ingredients" className="font-slab text-2xl font-bold">
                Ingredients
              </h2>
              {recipe.ingredients.length > 0 && (
                <ServingsStepper
                  value={servings}
                  label={base ? recipe.servingsLabel : "batches"}
                  onChange={setServings}
                />
              )}
            </div>
            {base && servings !== base && (
              <p className="flex flex-wrap items-center justify-between gap-2 bg-cobalt-wash px-5 py-2 text-[0.9375rem]">
                Scaled from {base} {recipe.servingsLabel}
                <button onClick={() => setServings(base)} className="min-h-10 font-semibold text-cobalt">
                  Reset
                </button>
              </p>
            )}
            <ul className="index-card__lines px-5 pb-5">
              {recipe.ingredients.map((ing, i) =>
                ing.isHeading ? (
                  <li key={i} className="font-slab text-lg font-semibold text-ink-soft">
                    {ing.name}
                  </li>
                ) : (
                  <li key={i}>
                    <button
                      onClick={() => setGotIngredients((s) => toggle(s, i))}
                      aria-pressed={gotIngredients.has(i)}
                      className={`flex w-full gap-3 text-left text-[1.125rem] ${
                        gotIngredients.has(i) ? "text-done line-through decoration-1" : ""
                      }`}
                    >
                      <Tick on={gotIngredients.has(i)} />
                      <span>
                        {ing.quantity !== null && (
                          <span className="font-bold leading-none">
                            {formatQuantity(ing.quantity, ing.quantityMax, ing.unit, factor)}
                            {ing.unit ? ` ${ing.unit}` : ""}{" "}
                          </span>
                        )}
                        {ing.name}
                        {ing.note && <span className="text-ink-soft">, {ing.note}</span>}
                      </span>
                    </button>
                  </li>
                ),
              )}
            </ul>
          </div>
        </section>

        {/* Method */}
        <section aria-labelledby="method">
          <h2 id="method" className="font-slab text-2xl font-bold">
            Method
          </h2>
          <p className="mt-1 text-[0.9375rem] text-ink-soft">Tap a step when it’s done.</p>
          <ol className="mt-4 border-t border-line">
            {recipe.steps.map((s, i) => {
              const done = doneSteps.has(i);
              const current = i === currentStep;
              return (
                <li key={i} className="border-b border-line">
                  <button
                    onClick={() => setDoneSteps((d) => toggle(d, i))}
                    aria-pressed={done}
                    className={`flex w-full gap-5 py-5 text-left text-[1.1875rem] leading-relaxed ${
                      done ? "text-done" : ""
                    }`}
                  >
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[6px] text-[1.375rem] font-bold tabular-nums ${
                        current ? "bg-butter text-[#1c2b4b]" : done ? "text-done" : "text-cobalt"
                      }`}
                    >
                      {done ? <Check className="h-6 w-6" /> : i + 1}
                    </span>
                    <span className="max-w-[62ch] pt-1.5">{s}</span>
                  </button>
                </li>
              );
            })}
          </ol>
          {currentStep === -1 && recipe.steps.length > 0 && (
            <p className="mt-4 flex items-center justify-between gap-3 text-ink-soft">
              All steps done.
              <button onClick={() => setDoneSteps(new Set())} className="btn-quiet">
                Start over
              </button>
            </p>
          )}

          {recipe.notes && (
            <div className="mt-10">
              <h3 className="font-slab text-xl font-bold">Notes</h3>
              <p className="mt-2 max-w-[62ch] whitespace-pre-line text-[1.125rem] leading-relaxed">
                {recipe.notes}
              </p>
            </div>
          )}
          {recipe.tags.length > 0 && (
            <p className="mt-8 text-[0.9375rem] text-ink-soft">
              Filed under {recipe.tags.join(", ")}
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

function ServingsStepper(props: { value: number; label: string; onChange: (n: number) => void }) {
  const { value, onChange } = props;
  const btn =
    "flex h-12 w-12 items-center justify-center text-cobalt active:bg-cobalt-wash disabled:text-done";
  return (
    <div className="flex items-stretch overflow-hidden rounded-[10px] border border-line">
      <button
        aria-label="Fewer"
        className={btn}
        disabled={value <= 0.5}
        onClick={() => onChange(Math.max(0.5, round(value - (value <= 2 ? 0.5 : 1))))}
      >
        <Minus />
      </button>
      <div
        className="flex min-w-24 flex-col items-center justify-center border-x border-line px-2 leading-none"
        aria-live="polite"
      >
        <span className="text-[1.375rem] font-bold tabular-nums">{value}</span>
        <span className="mt-0.5 text-[0.8125rem] text-ink-soft">{props.label}</span>
      </div>
      <button
        aria-label="More"
        className={btn}
        onClick={() => onChange(round(value + (value < 2 ? 0.5 : 1)))}
      >
        <Plus />
      </button>
    </div>
  );
}

function Tick({ on }: { on: boolean }) {
  return (
    <span className="flex h-[var(--rule-gap)] shrink-0 items-center">
      <span
        className={`flex h-[22px] w-[22px] items-center justify-center rounded-[4px] border-2 ${
          on ? "border-done bg-done text-paper" : "border-rule bg-paper"
        }`}
      >
        {on && <Check className="h-4 w-4" />}
      </span>
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
    <button onClick={() => setOn(!on)} aria-pressed={on} className={on ? "btn-primary" : "btn-plain"}>
      <Sun />
      {on ? "Screen stays on" : "Keep screen on"}
    </button>
  );
}

const noopSubscribe = () => () => {};
