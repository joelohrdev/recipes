import { connection } from "next/server";
import { Suspense } from "react";
import { WeekPlan } from "@/components/week-plan";
import { addDays } from "@/lib/dinner-picker";
import { getDinnersFrom, getRecipes } from "@/lib/recipes";

export const metadata = { title: "Dinners this week" };

export default function PlanPage() {
  return (
    <Suspense fallback={<p className="mt-10 text-ink-soft">Opening the plan…</p>}>
      <Plan />
    </Suspense>
  );
}

async function Plan() {
  await connection();
  // The server runs on UTC, so include yesterday; the page then hides
  // anything before the device's own today.
  const yesterday = addDays(new Date().toISOString().slice(0, 10), -1);
  const [dinners, recipes] = await Promise.all([getDinnersFrom(yesterday), getRecipes()]);
  return <WeekPlan dinners={dinners} recipeCount={recipes.length} />;
}
