"use client";

import { useState, useTransition } from "react";
import { deleteRecipeAction } from "@/app/actions";
import { Trash } from "./icons";

/**
 * A delete button that asks first, in the page rather than a browser pop-up,
 * so it reads clearly on an iPad and works the same in the installed app.
 */
export function DeleteRecipe({ id, title }: { id: number; title: string }) {
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!asking) {
    return (
      <button type="button" className="btn text-margin active:bg-cobalt-wash" onClick={() => setAsking(true)}>
        <Trash />
        Delete
      </button>
    );
  }

  return (
    <div role="alertdialog" aria-labelledby={`delete-${id}`} className="basis-full rounded-[10px] border border-margin bg-paper p-4">
      <p id={`delete-${id}`} className="font-semibold">
        Delete “{title || "this recipe"}”? This can’t be undone.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          autoFocus
          className="btn bg-margin text-white active:brightness-95"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setError(null);
              try {
                await deleteRecipeAction(id);
              } catch {
                setError(navigator.onLine ? "Couldn’t delete the recipe. Try again." : "You’re offline. Delete it when you’re back online.");
              }
            })
          }
        >
          <Trash />
          {pending ? "Deleting…" : "Delete recipe"}
        </button>
        <button type="button" className="btn-plain" disabled={pending} onClick={() => setAsking(false)}>
          Keep it
        </button>
      </div>
      {error && <p role="alert" className="mt-3 font-semibold text-margin">{error}</p>}
    </div>
  );
}
