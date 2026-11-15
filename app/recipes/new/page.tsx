import { Suspense } from "react";
import { requireUnlocked } from "@/lib/auth";
import { RecipeForm } from "@/components/recipe-form";
import { emptyRecipe } from "@/lib/types";

export const metadata = { title: "New recipe" };

export default function NewRecipePage() {
  return (
    <Suspense fallback={<p className="mt-10 text-center text-muted">Loading…</p>}>
      <NewRecipe />
    </Suspense>
  );
}

async function NewRecipe() {
  await requireUnlocked("/recipes/new");
  return <RecipeForm id={null} initial={emptyRecipe} allowPhoto />;
}
