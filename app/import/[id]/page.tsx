import { Suspense } from "react";
import Link from "next/link";
import { requireUnlocked } from "@/lib/auth";
import { findWebImport, saveWebImportResult } from "@/lib/db";
import { ExtractionError, recipeFromWebPage } from "@/lib/ai";
import { RecipeForm } from "@/components/recipe-form";

export const metadata = { title: "Import recipe" };

// Landing page for the browser bookmarklet. Claude reads the saved page once;
// the result is stored so a refresh doesn't pay for a second read.

export default function ImportPage({ params }: PageProps<"/import/[id]">) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto mt-16 max-w-md text-center">
          <p className="font-display text-3xl">Reading the recipe…</p>
          <p className="mt-3 animate-pulse text-muted">
            AI is pulling out the ingredients and steps. This can take up to a minute.
          </p>
        </div>
      }
    >
      <Import params={params} />
    </Suspense>
  );
}

async function Import({ params }: { params: PageProps<"/import/[id]">["params"] }) {
  const { id } = await params;
  await requireUnlocked(`/import/${id}`);

  const page = await findWebImport(id);
  if (!page) {
    return (
      <Message title="This import has expired">
        Go back to the recipe page and tap the browser button again.
      </Message>
    );
  }

  let recipe = page.result;
  if (!recipe) {
    try {
      recipe = await recipeFromWebPage(page);
      await saveWebImportResult(id, recipe);
    } catch (error) {
      if (!(error instanceof ExtractionError)) console.error(error);
      return (
        <Message title="Couldn't read that page">
          {error instanceof ExtractionError ? error.message : "Something went wrong."}{" "}
          <a href={page.url} className="text-accent underline">Back to the page</a>
        </Message>
      );
    }
  }

  return (
    <RecipeForm
      id={null}
      initial={recipe}
      importId={id}
      banner={
        <p className="mt-4 rounded-xl bg-accent-soft p-4">
          Imported from <b>{page.title || page.url}</b>. Check it over, then save.
        </p>
      }
    />
  );
}

function Message({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto mt-16 max-w-md text-center">
      <p className="font-display text-3xl">{title}</p>
      <p className="mt-3 text-muted">{children}</p>
      <Link href="/" className="btn-ghost mt-8">Back to recipes</Link>
    </div>
  );
}
