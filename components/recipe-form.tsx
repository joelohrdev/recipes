"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import {
  deleteRecipeAction,
  recipeFromPhotosAction,
  saveRecipeAction,
  uploadPhotoAction,
} from "@/app/actions";
import { parseQuantity, quantityToInput } from "@/lib/quantity";
import { PhotoError, preparePhoto, type PreparedPhoto } from "@/lib/prepare-photo";
import type { RecipeInput } from "@/lib/types";
import { ArrowDown, ArrowUp, Camera, Close, ImageIcon, Plus, Trash } from "./icons";

type Row = {
  key: number;
  qty: string;
  unit: string;
  name: string;
  note: string;
  isHeading: boolean;
};

let nextKey = 1;
const toRows = (r: RecipeInput): Row[] =>
  r.ingredients.map((i) => ({
    key: nextKey++,
    qty: quantityToInput(i.quantity, i.quantityMax),
    unit: i.unit,
    name: i.name,
    note: i.note,
    isHeading: i.isHeading,
  }));
const blankRow = (isHeading = false): Row => ({
  key: nextKey++,
  qty: "",
  unit: "",
  name: "",
  note: "",
  isHeading,
});

const numOrNull = (s: string) => {
  const n = parseFloat(s);
  return Number.isFinite(n) && n > 0 ? n : null;
};

export function RecipeForm({
  id,
  initial,
  importId,
  allowPhoto = false,
  banner,
}: {
  id: number | null;
  initial: RecipeInput;
  importId?: string;
  allowPhoto?: boolean;
  banner?: React.ReactNode;
}) {
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [servings, setServings] = useState(initial.servings ? String(initial.servings) : "");
  const [servingsLabel, setServingsLabel] = useState(initial.servingsLabel || "servings");
  const [prep, setPrep] = useState(initial.prepMinutes ? String(initial.prepMinutes) : "");
  const [cook, setCook] = useState(initial.cookMinutes ? String(initial.cookMinutes) : "");
  const [imageUrl, setImageUrl] = useState(initial.imageUrl);
  const [sourceUrl, setSourceUrl] = useState(initial.sourceUrl);
  const [tags, setTags] = useState(initial.tags.join(", "));
  const [notes, setNotes] = useState(initial.notes);
  const [rows, setRows] = useState<Row[]>(() => toRows(initial));
  const [steps, setSteps] = useState<string[]>(initial.steps.length ? initial.steps : [""]);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const load = (r: RecipeInput) => {
    setTitle(r.title);
    setDescription(r.description);
    setServings(r.servings ? String(r.servings) : "");
    setServingsLabel(r.servingsLabel || "servings");
    setPrep(r.prepMinutes ? String(r.prepMinutes) : "");
    setCook(r.cookMinutes ? String(r.cookMinutes) : "");
    if (r.imageUrl) setImageUrl(r.imageUrl);
    if (r.sourceUrl) setSourceUrl(r.sourceUrl);
    setTags(r.tags.join(", "));
    setNotes(r.notes);
    setRows(toRows(r));
    setSteps(r.steps.length ? r.steps : [""]);
  };

  const updateRow = (key: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const moveRow = (index: number, by: number) =>
    setRows((rs) => {
      const target = index + by;
      if (target < 0 || target >= rs.length) return rs;
      const copy = [...rs];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });

  const save = () => {
    setError(null);
    const recipe: RecipeInput = {
      title,
      description,
      servings: numOrNull(servings),
      servingsLabel,
      prepMinutes: numOrNull(prep),
      cookMinutes: numOrNull(cook),
      imageUrl,
      sourceUrl,
      notes,
      tags: tags.split(","),
      ingredients: rows.map((r) => ({
        ...(r.isHeading ? { quantity: null, quantityMax: null } : parseQuantity(r.qty)),
        unit: r.isHeading ? "" : r.unit,
        name: r.name,
        note: r.isHeading ? "" : r.note,
        isHeading: r.isHeading,
      })),
      steps,
    };
    startSaving(async () => {
      const result = await saveRecipeAction(id, recipe, importId);
      if (result?.error) setError(result.error);
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="mx-auto max-w-4xl"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-slab text-[2.5rem] font-bold leading-tight">
          {id ? "Edit recipe" : importId ? "Check the import" : "New recipe"}
        </h1>
        <div className="flex gap-2">
          <Link href={id ? `/recipes/${id}` : "/"} className="btn-plain">Cancel</Link>
          <button className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Save recipe"}</button>
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-5 rounded-[8px] border-l-4 border-margin bg-paper p-4 font-semibold">
          {error}
        </p>
      )}
      {banner}
      {allowPhoto && <PhotoImport onRecipe={load} />}

      <DishPhoto url={imageUrl} onChange={setImageUrl} />

      <Section title="About this recipe">
      <div className="grid gap-5 md:grid-cols-2">
        <label className="md:col-span-2">
          <span className="label">Title</span>
          <input className="field font-slab text-xl font-semibold" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label className="md:col-span-2">
          <span className="label">Description</span>
          <textarea className="field min-h-20 py-3" value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label>
            <span className="label">Makes</span>
            <input className="field" inputMode="decimal" value={servings} onChange={(e) => setServings(e.target.value)} placeholder="4" />
          </label>
          <label>
            <span className="label">Unit</span>
            <input className="field" value={servingsLabel} onChange={(e) => setServingsLabel(e.target.value)} placeholder="servings" />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label>
            <span className="label">Prep minutes</span>
            <input className="field" inputMode="numeric" value={prep} onChange={(e) => setPrep(e.target.value)} />
          </label>
          <label>
            <span className="label">Cook minutes</span>
            <input className="field" inputMode="numeric" value={cook} onChange={(e) => setCook(e.target.value)} />
          </label>
        </div>
        <label className="md:col-span-2">
          <span className="label">Where it came from</span>
          <input className="field" type="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://…" />
        </label>
        <label className="md:col-span-2">
          <span className="label">Tags, separated by commas</span>
          <input className="field" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="dinner, chicken, quick" />
        </label>
      </div>
      </Section>

      <Section
        title="Ingredients"
        hint={<>Amounts like <b>1 1/2</b>, <b>½</b> or <b>2-3</b> scale when you change servings.</>}
      >
        {rows.length > 0 && (
          <div className="mb-2 hidden grid-cols-[5.5rem_6rem_minmax(0,2fr)_minmax(0,1.3fr)_8.5rem] gap-2 px-0.5 text-[0.9375rem] text-ink-soft md:grid">
            <span>Amount</span><span>Unit</span><span>Ingredient</span><span>Note</span>
          </div>
        )}
        <ul className="divide-y divide-line border-y border-line md:divide-y-0 md:border-0 md:space-y-2">
          {rows.map((r, i) => (
            <li key={r.key} className="flex items-center gap-2 py-3 md:py-0">
              {r.isHeading ? (
                <input
                  className="field font-slab text-lg font-semibold"
                  value={r.name}
                  onChange={(e) => updateRow(r.key, { name: e.target.value })}
                  placeholder="Section, e.g. For the sauce"
                  aria-label="Section heading"
                />
              ) : (
                <div className="grid flex-1 grid-cols-[5rem_5.5rem_minmax(0,1fr)] gap-2 md:grid-cols-[5.5rem_6rem_minmax(0,2fr)_minmax(0,1.3fr)]">
                  <input className="field px-3" value={r.qty} onChange={(e) => updateRow(r.key, { qty: e.target.value })} placeholder={i === 0 ? "1 1/2" : undefined} aria-label="Amount" />
                  <input className="field px-3" value={r.unit} onChange={(e) => updateRow(r.key, { unit: e.target.value })} placeholder={i === 0 ? "cup" : undefined} aria-label="Unit" autoCapitalize="none" />
                  <input className="field px-3" value={r.name} onChange={(e) => updateRow(r.key, { name: e.target.value })} placeholder={i === 0 ? "flour" : undefined} aria-label="Ingredient" />
                  <input className="field col-span-3 px-3 md:col-span-1" value={r.note} onChange={(e) => updateRow(r.key, { note: e.target.value })} placeholder={i === 0 ? "sifted" : undefined} aria-label="Note" />
                </div>
              )}
              <RowTools
                onUp={() => moveRow(i, -1)}
                onDown={() => moveRow(i, 1)}
                onRemove={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
              />
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn-plain" onClick={() => setRows((rs) => [...rs, blankRow()])}>
            <Plus /> Add ingredient
          </button>
          <button type="button" className="btn-quiet" onClick={() => setRows((rs) => [...rs, blankRow(true)])}>
            <Plus /> Add a group heading
          </button>
        </div>
      </Section>

      <Section title="Method">
        <ol className="space-y-3">
          {steps.map((s, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-2.5 w-8 shrink-0 text-center text-[1.375rem] font-bold text-cobalt">
                {i + 1}
              </span>
              <textarea
                className="field min-h-24 py-3"
                value={s}
                onChange={(e) => setSteps((st) => st.map((x, j) => (j === i ? e.target.value : x)))}
                aria-label={`Step ${i + 1}`}
              />
              <RowTools
                onUp={() => setSteps((st) => swap(st, i, i - 1))}
                onDown={() => setSteps((st) => swap(st, i, i + 1))}
                onRemove={() => setSteps((st) => st.filter((_, j) => j !== i))}
              />
            </li>
          ))}
        </ol>
        <button type="button" className="btn-plain mt-4" onClick={() => setSteps((st) => [...st, ""])}>
          <Plus /> Add step
        </button>
      </Section>

      <Section title="Notes">
        <textarea
          aria-label="Notes"
          className="field min-h-28 py-3"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Tips, swaps, how to store it"
        />
      </Section>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
        {id ? <DeleteButton id={id} /> : <span />}
        <button className="btn-primary h-14 px-8 text-lg" disabled={saving}>{saving ? "Saving…" : "Save recipe"}</button>
      </div>
    </form>
  );
}

function swap<T>(list: T[], a: number, b: number) {
  if (b < 0 || b >= list.length) return list;
  const copy = [...list];
  [copy[a], copy[b]] = [copy[b], copy[a]];
  return copy;
}

function Section(props: { title: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-slab text-2xl font-bold">{props.title}</h2>
      {props.hint && <p className="mt-1 text-[0.9375rem] text-ink-soft">{props.hint}</p>}
      <div className="mt-4">{props.children}</div>
    </section>
  );
}

function RowTools(props: { onUp: () => void; onDown: () => void; onRemove: () => void }) {
  const cls = "flex h-11 w-11 items-center justify-center rounded-[8px] text-ink-soft active:bg-cobalt-wash";
  return (
    <div className="flex shrink-0 flex-col md:flex-row">
      <button type="button" className={cls} onClick={props.onUp} aria-label="Move up"><ArrowUp /></button>
      <button type="button" className={cls} onClick={props.onDown} aria-label="Move down"><ArrowDown /></button>
      <button type="button" className={cls} onClick={props.onRemove} aria-label="Remove"><Close /></button>
    </div>
  );
}

function DeleteButton({ id }: { id: number }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="btn text-margin active:bg-cobalt-wash"
      disabled={pending}
      onClick={() => {
        if (confirm("Delete this recipe? This can't be undone.")) start(() => deleteRecipeAction(id));
      }}
    >
      <Trash />
      {pending ? "Deleting…" : "Delete recipe"}
    </button>
  );
}

// ---- Photo → recipe ----

// Long-edge sizes to try, largest first. Several pages together must fit in
// one upload, so if they don't, every page is redone at the next size down.
const PAGE_EDGES = [1600, 1300, 1050];
const MAX_PHOTOS = 8;
// Vercel rejects requests over 4.5 MB, so keep the photos well under that.
const MAX_UPLOAD_CHARS = 4_000_000;

type Page = { id: number; file: File; url: string };
let nextPageId = 1;

function PhotoImport({ onRecipe }: { onRecipe: (r: RecipeInput) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const full = pages.length >= MAX_PHOTOS;

  const addFiles = (picked: File[]) => {
    const room = MAX_PHOTOS - pages.length;
    setError(picked.length > room ? `You can add up to ${MAX_PHOTOS} pages.` : null);
    const added = picked.slice(0, room).map((file) => ({ id: nextPageId++, file, url: URL.createObjectURL(file) }));
    setPages((ps) => [...ps, ...added]);
  };

  const removePage = (id: number) =>
    setPages((ps) => {
      const page = ps.find((p) => p.id === id);
      if (page) URL.revokeObjectURL(page.url);
      return ps.filter((p) => p.id !== id);
    });

  const movePage = (index: number, by: number) => setPages((ps) => swap(ps, index, index + by));

  const clear = () =>
    setPages((ps) => {
      ps.forEach((p) => URL.revokeObjectURL(p.url));
      return [];
    });

  const run = () => {
    setError(null);
    start(async () => {
      try {
        let photos: PreparedPhoto[] | null = null;
        for (const edge of PAGE_EDGES) {
          const prepared: PreparedPhoto[] = [];
          // One at a time: decoding several large photos at once can exhaust
          // Safari's image memory on an iPad.
          for (const [i, page] of pages.entries()) {
            setStatus(pages.length > 1 ? `Preparing page ${i + 1} of ${pages.length}…` : "Preparing photo…");
            prepared.push(await preparePhoto(page.file, edge));
          }
          if (prepared.reduce((sum, p) => sum + p.data.length, 0) <= MAX_UPLOAD_CHARS) {
            photos = prepared;
            break;
          }
        }
        if (!photos) {
          setError("Those pages are too large to send together. Remove a page or two and try again.");
          return;
        }
        setStatus(
          pages.length > 1
            ? `Reading ${pages.length} pages. This can take a minute or two.`
            : "Reading the recipe. This can take up to a minute.",
        );
        const result = await recipeFromPhotosAction(photos);
        if ("error" in result) setError(result.error);
        else {
          onRecipe(result.recipe);
          clear();
        }
      } catch (e) {
        setError(e instanceof PhotoError ? e.message : "Something went wrong reading the photo. Try again.");
      } finally {
        setStatus(null);
      }
    });
  };

  return (
    <div className="mt-6 rounded-[10px] bg-cobalt-wash p-5">
      <div className="flex flex-wrap items-center gap-4">
        <Camera className="h-8 w-8 shrink-0 text-cobalt" />
        <div className="min-w-56 flex-1">
          <h2 className="font-slab text-xl font-bold">Fill in from a photo</h2>
          <p className="mt-0.5 text-[0.9375rem] text-ink-soft">
            Photograph a printed recipe or recipe card. If it runs over several pages, take a
            photo of each page in order, up to {MAX_PHOTOS}. Check what was filled in before you save.
          </p>
        </div>
        <input
          ref={input}
          type="file"
          accept="image/*,.dng"
          multiple
          hidden
          onChange={(e) => {
            addFiles(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
        {pages.length === 0 && (
          <button type="button" className="btn-plain" onClick={() => input.current?.click()}>
            Take or choose photo
          </button>
        )}
        {pages.length > 0 && (
          <button type="button" className="btn-primary" onClick={run} disabled={pending}>
            {pending ? "Reading…" : pages.length > 1 ? `Read ${pages.length} pages` : "Read this page"}
          </button>
        )}
      </div>
      {pages.length > 0 && (
        <ol className="mt-5 flex flex-wrap gap-4" aria-label="Pages">
          {pages.map((page, i) => (
            <li key={page.id} className="w-32">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={page.url} alt={`Page ${i + 1}`} className="h-40 w-32 rounded-[4px] border border-line bg-paper object-cover" />
                {!pending && (
                  <button
                    type="button"
                    aria-label={`Remove page ${i + 1}`}
                    onClick={() => removePage(page.id)}
                    className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-ink text-paper"
                  >
                    <Close className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="whitespace-nowrap text-[0.9375rem] font-bold">Page {i + 1}</span>
                {pages.length > 1 && !pending && (
                  <span className="flex">
                    <button
                      type="button"
                      aria-label={`Move page ${i + 1} earlier`}
                      disabled={i === 0}
                      onClick={() => movePage(i, -1)}
                      className="flex h-10 w-10 items-center justify-center rounded-[6px] text-ink-soft active:bg-paper disabled:opacity-30"
                    >
                      <ArrowUp className="h-4 w-4 -rotate-90" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Move page ${i + 1} later`}
                      disabled={i === pages.length - 1}
                      onClick={() => movePage(i, 1)}
                      className="flex h-10 w-10 items-center justify-center rounded-[6px] text-ink-soft active:bg-paper disabled:opacity-30"
                    >
                      <ArrowDown className="h-4 w-4 -rotate-90" />
                    </button>
                  </span>
                )}
              </div>
            </li>
          ))}
          {!full && !pending && (
            <li className="w-32">
              <button
                type="button"
                onClick={() => input.current?.click()}
                className="flex h-40 w-32 flex-col items-center justify-center gap-1.5 rounded-[4px] border-2 border-dashed border-rule text-cobalt active:bg-paper"
              >
                <Plus className="h-6 w-6" />
                <span className="font-semibold">Add page {pages.length + 1}</span>
              </button>
            </li>
          )}
        </ol>
      )}
      {status && <p className="mt-3 font-semibold" aria-live="polite">{status}</p>}
      {error && <p role="alert" className="mt-3 font-semibold text-margin">{error}</p>}
    </div>
  );
}

// ---- Picture of the finished dish ----

function DishPhoto({ url, onChange }: { url: string; onChange: (url: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const upload = (file: File) => {
    setError(null);
    start(async () => {
      try {
        const result = await uploadPhotoAction(await preparePhoto(file, 1400));
        if ("error" in result) setError(result.error);
        else onChange(result.url);
      } catch (e) {
        setError(e instanceof PhotoError ? e.message : "Couldn't upload that photo. Try again.");
      }
    });
  };

  return (
    <div className="mt-6 flex flex-wrap items-center gap-5">
      <div className="h-32 w-44 shrink-0 overflow-hidden rounded-md border border-line bg-paper">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-done">
            <ImageIcon className="h-9 w-9" />
          </div>
        )}
      </div>
      <div className="min-w-60 flex-1">
        <h2 className="font-slab text-xl font-bold">Picture of the dish</h2>
        <p className="text-[0.9375rem] text-ink-soft">Shown on the recipe and in your list.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            ref={input}
            type="file"
            accept="image/*,.dng"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload(file);
              e.target.value = "";
            }}
          />
          <button type="button" className="btn-plain" onClick={() => input.current?.click()} disabled={pending}>
            <Camera />
            {pending ? "Uploading…" : url ? "Change picture" : "Take or choose picture"}
          </button>
          {url && !pending && (
            <button type="button" className="btn-quiet" onClick={() => onChange("")}>
              Remove
            </button>
          )}
        </div>
        {error && <p role="alert" className="mt-2 font-semibold text-margin">{error}</p>}
      </div>
    </div>
  );
}
