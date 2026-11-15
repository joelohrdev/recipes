"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { totalTime } from "@/lib/format";
import type { RecipeSummary } from "@/lib/types";
import { Bookmark, Bowl, Camera, Clock, Plus, Search } from "./icons";
import { SaveForOffline } from "./pwa";

export function RecipeGrid({ recipes }: { recipes: RecipeSummary[] }) {
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);

  // The most used tags become divider tabs.
  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of recipes) for (const t of r.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 12)
      .map(([t]) => t);
  }, [recipes]);

  if (recipes.length === 0) return <EmptyBox />;

  const q = query.trim().toLowerCase();
  const shown = recipes.filter(
    (r) =>
      (!tag || r.tags.includes(tag)) &&
      (!q ||
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.tags.some((t) => t.includes(q))),
  );

  return (
    <div>
      <SaveForOffline recipes={recipes} />
      <label className="relative block max-w-xl">
        <span className="sr-only">Search recipes</span>
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-soft" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={recipes.length === 1 ? "Search 1 recipe" : `Search ${recipes.length} recipes`}
          className="field h-14 pl-12 text-lg"
        />
      </label>

      <div className="divider-tabs mt-8 flex gap-1">
        <Tab active={tag === null} onClick={() => setTag(null)}>
          All recipes
        </Tab>
        {tags.map((t) => (
          <Tab key={t} active={tag === t} onClick={() => setTag(tag === t ? null : t)}>
            <span className="capitalize">{t}</span>
          </Tab>
        ))}
      </div>

      <div className="rounded-b-[10px] border border-t-0 border-line bg-paper p-5 md:p-7">
        {shown.length === 0 ? (
          <p className="py-10 text-center text-ink-soft">
            Nothing matches{q ? ` “${query.trim()}”` : ""}
            {tag ? ` under ${tag}` : ""}.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((r) => (
              <li key={r.id}>
                <RecipeTile recipe={r} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Tab(props: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      aria-pressed={props.active}
      onClick={props.onClick}
      className="divider-tab min-h-12 shrink-0 px-5 font-semibold text-ink-soft"
    >
      {props.children}
    </button>
  );
}

function RecipeTile({ recipe: r }: { recipe: RecipeSummary }) {
  const time = totalTime(r.prepMinutes, r.cookMinutes);
  return (
    <Link href={`/recipes/${r.id}`} className="group block rounded-md">
      <div className="aspect-[4/3] overflow-hidden rounded-md bg-enamel">
        {r.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={r.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <CardPlaceholder />
        )}
      </div>
      <h2 className="mt-3 font-slab text-[1.4375rem] font-semibold leading-tight group-active:text-cobalt">
        {r.title}
      </h2>
      {(time || r.servings) && (
        <div className="mt-1.5 flex flex-wrap gap-x-4 text-[0.9375rem] text-ink-soft">
          {time && (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {time}
            </span>
          )}
          {r.servings ? (
            <span className="inline-flex items-center gap-1.5">
              <Bowl className="h-4 w-4" />
              {r.servings} {r.servingsLabel}
            </span>
          ) : null}
        </div>
      )}
    </Link>
  );
}

/** Recipes without a picture show a blank index card instead. */
function CardPlaceholder() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="index-card h-3/5 w-1/2 rotate-[-3deg] px-[8%] pt-[9%]">
        <div className="h-[3px] rounded bg-margin/80" />
        <div className="mt-[14%] h-[3px] rounded bg-rule" />
        <div className="mt-[14%] h-[3px] w-4/5 rounded bg-rule" />
        <div className="mt-[14%] h-[3px] w-3/5 rounded bg-rule" />
      </div>
    </div>
  );
}

function EmptyBox() {
  return (
    <div className="mx-auto mt-10 max-w-lg">
      <h1 className="font-slab text-4xl font-bold">No recipes yet</h1>
      <p className="mt-3 text-lg text-ink-soft">Add your first one in whichever way is easiest:</p>
      <div className="mt-6 grid gap-3">
        <Link href="/recipes/new" className="btn-plain justify-start px-5 py-3 text-left">
          <Camera className="h-6 w-6 shrink-0 text-cobalt" />
          <span>
            Photograph a printed recipe
            <span className="block text-[0.9375rem] font-normal text-ink-soft">
              The form fills itself in from the picture.
            </span>
          </span>
        </Link>
        <Link href="/bookmarklet" className="btn-plain justify-start px-5 py-3 text-left">
          <Bookmark className="h-6 w-6 shrink-0 text-cobalt" />
          <span>
            Save one from a website
            <span className="block text-[0.9375rem] font-normal text-ink-soft">
              Set up the browser button once, then tap it on any recipe page.
            </span>
          </span>
        </Link>
        <Link href="/recipes/new" className="btn-plain justify-start px-5 py-3 text-left">
          <Plus className="h-6 w-6 shrink-0 text-cobalt" />
          <span>
            Type one in
            <span className="block text-[0.9375rem] font-normal text-ink-soft">
              Ingredients, steps and notes.
            </span>
          </span>
        </Link>
      </div>
    </div>
  );
}
