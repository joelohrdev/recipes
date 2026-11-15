import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireUnlocked } from "@/lib/auth";
import { getRecipe } from "@/lib/recipes";
import { RecipeForm } from "@/components/recipe-form";

export const metadata = { title: "Edit recipe" };

export default function EditRecipePage({ params }: PageProps<"/recipes/[id]/edit">) {
  return (
    <Suspense fallback={<p className="mt-10 text-ink-soft">Opening the recipe…</p>}>
      <EditRecipe params={params} />
    </Suspense>
  );
}

async function EditRecipe({ params }: { params: PageProps<"/recipes/[id]/edit">["params"] }) {
  const { id } = await params;
  await requireUnlocked(`/recipes/${id}/edit`);
  const recipe = /^\d+$/.test(id) ? await getRecipe(Number(id)) : null;
  if (!recipe) notFound();
  return <RecipeForm key={recipe.updatedAt} id={recipe.id} initial={recipe} />;
}
