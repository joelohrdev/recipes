"use client";

import Link from "next/link";
import { useState, useSyncExternalStore, useTransition } from "react";
import { clearDinnersAction, pickDinnersAction, swapDinnerAction } from "@/app/actions";
import type { PlannedDinner } from "@/lib/db";
import { addDays } from "@/lib/dinner-picker";
import { totalTime } from "@/lib/format";
import { Bowl, Shuffle } from "./icons";

const COUNTS = [3, 4, 5, 6, 7];

export function WeekPlan({ dinners, recipeCount }: { dinners: PlannedDinner[]; recipeCount: number }) {
  const today = useToday();
  const planned = today ? dinners.filter((d) => d.date >= today) : dinners;
  const [count, setCount] = useState(planned.length >= 3 ? planned.length : 7);
  const [startTomorrow, setStartTomorrow] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [swapping, setSwapping] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const pick = () => {
    if (!today) return;
    setMessage(null);
    start(async () => {
      const result = await pickDinnersAction(startTomorrow ? addDays(today, 1) : today, count);
      if ("error" in result) setMessage(result.error);
      else if (result.picked < count) {
        setMessage(
          `There are only ${result.picked} recipes to choose from, so ${result.picked} dinners were picked.`,
        );
      }
    });
  };

  const swap = (date: string) => {
    setMessage(null);
    setSwapping(date);
    start(async () => {
      const result = await swapDinnerAction(date);
      if ("error" in result) setMessage(result.error);
      setSwapping(null);
    });
  };

  const clear = () => {
    if (!today) return;
    setMessage(null);
    start(() => clearDinnersAction(today));
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-slab text-[2.5rem] font-bold leading-tight md:text-[3rem]">Dinners this week</h1>
      <p className="mt-2 max-w-[60ch] text-lg text-ink-soft">
        Picks favor dinners you haven’t had lately, so the same ones don’t keep coming back.
        Recipes tagged “dinner” are used first.
      </p>

      {recipeCount === 0 ? (
        <div className="mt-8 rounded-[10px] border border-line bg-paper p-6">
          <p className="text-lg font-semibold">There are no recipes to choose from yet.</p>
          <Link href="/recipes/new" className="btn-primary mt-4">Add a recipe</Link>
        </div>
      ) : (
        <div className="mt-8 rounded-[10px] bg-cobalt-wash p-5">
          <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
            <Choice label="How many dinners">
              {COUNTS.map((n) => (
                <Segment key={n} selected={count === n} onClick={() => setCount(n)} disabled={pending}>
                  {n}
                </Segment>
              ))}
            </Choice>
            <Choice label="Starting">
              <Segment selected={!startTomorrow} onClick={() => setStartTomorrow(false)} disabled={pending}>
                Today
              </Segment>
              <Segment selected={startTomorrow} onClick={() => setStartTomorrow(true)} disabled={pending}>
                Tomorrow
              </Segment>
            </Choice>
            <button type="button" className="btn-primary ml-auto" onClick={pick} disabled={pending || !today}>
              <Shuffle />
              {pending && !swapping ? "Picking…" : planned.length ? "Pick new dinners" : "Pick dinners"}
            </button>
          </div>
        </div>
      )}

      {message && <p role="alert" className="mt-4 font-semibold text-margin">{message}</p>}

      {planned.length > 0 && (
        <>
          <ol className="mt-8 overflow-hidden rounded-[10px] border border-line bg-paper">
            {planned.map((d) => {
              const tonight = d.date === today;
              const time = totalTime(d.recipe.prepMinutes, d.recipe.cookMinutes);
              return (
                <li
                  key={d.date}
                  className={`flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0 sm:px-5 ${tonight ? "bg-butter/35" : ""}`}
                >
                  <div className="w-[4.5rem] shrink-0 sm:w-28">
                    <p className="font-slab text-xl font-bold leading-tight">
                      <span className="sm:hidden">{weekday(d.date).slice(0, 3)}</span>
                      <span className="max-sm:hidden">{weekday(d.date)}</span>
                    </p>
                    <p className="text-[0.9375rem] text-ink-soft">{tonight ? "Tonight" : monthDay(d.date)}</p>
                  </div>
                  <Link href={`/recipes/${d.recipe.id}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-md">
                    {d.recipe.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={d.recipe.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-[6px] object-cover max-sm:hidden" />
                    ) : (
                      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[6px] bg-cobalt-wash text-cobalt max-sm:hidden">
                        <Bowl className="h-6 w-6" />
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="line-clamp-2 text-lg font-bold leading-snug">{d.recipe.title}</span>
                      {time && <span className="block text-[0.9375rem] text-ink-soft">{time}</span>}
                    </span>
                  </Link>
                  <button
                    type="button"
                    className="btn-quiet shrink-0 max-sm:px-2.5"
                    onClick={() => swap(d.date)}
                    disabled={pending}
                    aria-label={`Swap ${weekday(d.date)}’s dinner`}
                  >
                    <Shuffle />
                    <span className="max-sm:hidden">{swapping === d.date ? "Swapping…" : "Swap"}</span>
                  </button>
                </li>
              );
            })}
          </ol>
          <button type="button" className="btn-quiet mt-3" onClick={clear} disabled={pending}>
            Clear the plan
          </button>
        </>
      )}
    </div>
  );
}

function Choice({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={label}>
      <p className="label">{label}</p>
      <div className="flex gap-1 rounded-[10px] border border-line bg-paper p-1">{children}</div>
    </div>
  );
}

function Segment(props: { selected: boolean; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={props.selected}
      onClick={props.onClick}
      disabled={props.disabled}
      className={`min-h-11 min-w-11 rounded-[7px] px-3 text-[1.0625rem] font-bold ${
        props.selected ? "bg-cobalt text-cobalt-ink" : "text-ink active:bg-cobalt-wash"
      }`}
    >
      {props.children}
    </button>
  );
}

// The device's own calendar date, which can differ from the server's.
function useToday() {
  return useSyncExternalStore(
    subscribeToMidnight,
    () => localDate(),
    () => null,
  );
}

function subscribeToMidnight(onChange: () => void) {
  const id = setInterval(onChange, 60_000);
  return () => clearInterval(id);
}

function localDate() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const weekdayFormat = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" });
const monthDayFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

function weekday(date: string) {
  return weekdayFormat.format(new Date(`${date}T00:00:00Z`));
}

function monthDay(date: string) {
  return monthDayFormat.format(new Date(`${date}T00:00:00Z`));
}
