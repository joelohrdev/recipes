"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { RecipeSummary } from "@/lib/types";

export function RecipeGrid({ recipes }: { recipes: RecipeSummary[] }) {
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);

  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of recipes) for (const t of r.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 14)
      .map(([t]) => t);
  }, [recipes]);

  const shown = recipes.filter((r) => {
    if (tag && !r.tags.includes(tag)) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      r.title.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      r.tags.some((t) => t.includes(q))
    );
  });

  if (recipes.length === 0) {
    return (
      <div className="mx-auto mt-16 max-w-md text-center">
        <p className="font-display text-3xl">Your recipe box is empty</p>
        <p className="mt-3 text-muted">
          Add one by typing it in, snapping a photo of a printed recipe, or using the browser button
          on any recipe website.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/recipes/new" className="btn-primary">
            Add a recipe
          </Link>
          <Link href="/bookmarklet" className="btn-ghost">
            Set up browser button
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={`Search ${recipes.length} recipes…`}
        className="field h-14 rounded-2xl text-lg"
      />
      {tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {tags.map((t) => (
            <button
              key={t}
              onClick={() => setTag(tag === t ? null : t)}
              className={`min-h-10 rounded-full border px-4 text-sm font-semibold transition ${
                tag === t
                  ? "border-accent bg-accent text-accent-ink"
                  : "border-line bg-card text-muted"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      <ul className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((r) => (
          <li key={r.id}>
            <Link
              href={`/recipes/${r.id}`}
              className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-card transition active:scale-[0.99]"
            >
              <div className="aspect-[4/3] overflow-hidden bg-accent-soft">
                {r.imageUrl ? (
                  // Pictures come from many recipe sites, so skip next/image domain config.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.imageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center font-display text-6xl text-accent/60">
                    {r.title.slice(0, 1)}
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col p-4">
                <h2 className="font-display text-xl font-semibold leading-snug">{r.title}</h2>
                {r.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-muted">{r.description}</p>
                )}
                <p className="mt-auto pt-2 text-sm font-semibold text-muted">
                  {[
                    totalTime(r.prepMinutes, r.cookMinutes),
                    r.servings ? `${r.servings} ${r.servingsLabel}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {shown.length === 0 && <p className="mt-10 text-center text-muted">No recipes match.</p>}
    </div>
  );
}

export function totalTime(prep: number | null, cook: number | null) {
  const total = (prep ?? 0) + (cook ?? 0);
  if (!total) return null;
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
