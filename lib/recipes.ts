import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { findRecipe, listDinnersFrom, listRecipes } from "./db";

// Recipe reads are cached until a create/update/delete calls updateTag("recipes").

export async function getRecipes() {
  "use cache";
  cacheLife("max");
  cacheTag("recipes");
  return listRecipes();
}

export async function getRecipe(id: number) {
  "use cache";
  cacheLife("max");
  cacheTag("recipes", `recipe-${id}`);
  return findRecipe(id);
}

export async function getDinnersFrom(date: string) {
  "use cache";
  cacheLife("max");
  // Recipe edits and deletes change the plan's titles and photos too.
  cacheTag("plan", "recipes");
  return listDinnersFrom(date);
}
