import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getRecipe } from "@/lib/recipes";
import { CookingView } from "@/components/cooking-view";

export async function generateMetadata({ params }: PageProps<"/recipes/[id]">) {
  const { id } = await params;
  const recipe = /^\d+$/.test(id) ? await getRecipe(Number(id)) : null;
  return { title: recipe?.title ?? "Recipe" };
}

export default function RecipePage({ params }: PageProps<"/recipes/[id]">) {
  return (
    <Suspense fallback={<p className="mt-10 text-ink-soft">Opening the recipe…</p>}>
      <Recipe params={params} />
    </Suspense>
  );
}

async function Recipe({ params }: { params: PageProps<"/recipes/[id]">["params"] }) {
  const { id } = await params;
  const recipe = /^\d+$/.test(id) ? await getRecipe(Number(id)) : null;
  if (!recipe) notFound();
  return <CookingView recipe={recipe} />;
}
