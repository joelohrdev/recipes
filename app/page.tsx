import { connection } from "next/server";
import { Suspense } from "react";
import { getRecipes } from "@/lib/recipes";
import { RecipeGrid } from "@/components/recipe-grid";

export default function Home() {
  return (
    <Suspense fallback={<div className="field h-14 animate-pulse rounded-2xl" />}>
      <Recipes />
    </Suspense>
  );
}

async function Recipes() {
  // Read the database at request time rather than baking the list into the build.
  await connection();
  const recipes = await getRecipes();
  return <RecipeGrid recipes={recipes} />;
}
