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
        <div className="mx-auto mt-10 max-w-md" aria-live="polite">
          <ReadingCard />
          <p className="mt-8 font-slab text-3xl font-bold">Reading the recipe</p>
          <p className="mt-2 text-lg text-ink-soft">
            Copying the ingredients and steps onto a card. This can take up to a minute.
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
          <a href={page.url} className="font-semibold text-cobalt underline">Back to the page</a>
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
        <p className="mt-4 text-lg text-ink-soft">
          Read from <span className="font-semibold text-ink">{page.title || page.url}</span>.
          Check it over, then save.
        </p>
      }
    />
  );
}

function Message({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto mt-10 max-w-md">
      <h1 className="font-slab text-3xl font-bold">{title}</h1>
      <p className="mt-3 text-lg text-ink-soft">{children}</p>
      <Link href="/" className="btn-plain mt-8">Back to recipes</Link>
    </div>
  );
}

/** A blank index card being written on, shown while the page is read. */
function ReadingCard() {
  return (
    <div className="index-card w-56 rotate-[-2deg] px-5 pb-6 pt-5" aria-hidden="true">
      <div className="h-1 rounded bg-margin" />
      {[100, 85, 92, 60].map((w, i) => (
        <div key={i} className="mt-5 h-1 rounded bg-rule">
          <div
            className="h-full origin-left rounded bg-ink-soft/70 motion-safe:animate-[write_2.4s_ease-in-out_infinite]"
            style={{ width: `${w}%`, animationDelay: `${i * 0.35}s` }}
          />
        </div>
      ))}
    </div>
  );
}
