"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { deleteRecipeAction, recipeFromPhotosAction, saveRecipeAction } from "@/app/actions";
import { parseQuantity, quantityToInput } from "@/lib/quantity";
import type { RecipeInput } from "@/lib/types";

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
        <h1 className="font-display text-3xl font-semibold">{id ? "Edit recipe" : "New recipe"}</h1>
        <div className="flex gap-2">
          <Link href={id ? `/recipes/${id}` : "/"} className="btn-ghost">Cancel</Link>
          <button className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Save recipe"}</button>
        </div>
      </div>
      {error && <p className="mt-4 rounded-xl bg-accent-soft p-4 font-semibold text-accent">{error}</p>}
      {banner}
      {allowPhoto && <PhotoImport onRecipe={load} />}

      <div className="mt-6 grid gap-5 rounded-2xl border border-line bg-card p-5 md:grid-cols-2">
        <label className="md:col-span-2">
          <span className="label">Title</span>
          <input className="field text-lg" value={title} onChange={(e) => setTitle(e.target.value)} required />
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
            <span className="label">Prep (min)</span>
            <input className="field" inputMode="numeric" value={prep} onChange={(e) => setPrep(e.target.value)} />
          </label>
          <label>
            <span className="label">Cook (min)</span>
            <input className="field" inputMode="numeric" value={cook} onChange={(e) => setCook(e.target.value)} />
          </label>
        </div>
        <label className="md:col-span-2">
          <span className="label">Source URL</span>
          <input className="field" type="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://…" />
        </label>
        <label className="md:col-span-2">
          <span className="label">Tags (comma separated)</span>
          <input className="field" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="dinner, chicken, quick" />
        </label>
      </div>

      <section className="mt-8">
        <h2 className="font-display text-2xl font-semibold">Ingredients</h2>
        <p className="mt-1 text-sm text-muted">
          Amounts like <b>1 1/2</b>, <b>½</b> or <b>2-3</b> scale when you change servings.
        </p>
        <ul className="mt-4 space-y-2">
          {rows.map((r, i) => (
            <li key={r.key} className="flex items-center gap-2 rounded-xl border border-line bg-card p-2">
              {r.isHeading ? (
                <input
                  className="field font-bold uppercase tracking-wide"
                  value={r.name}
                  onChange={(e) => updateRow(r.key, { name: e.target.value })}
                  placeholder="Section, e.g. For the sauce"
                  aria-label="Section heading"
                />
              ) : (
                <div className="grid flex-1 grid-cols-[5rem_5.5rem_minmax(0,1fr)] gap-2 md:grid-cols-[5.5rem_6rem_minmax(0,2fr)_minmax(0,1.3fr)]">
                  <input className="field px-3" value={r.qty} onChange={(e) => updateRow(r.key, { qty: e.target.value })} placeholder="1 1/2" aria-label="Amount" />
                  <input className="field px-3" value={r.unit} onChange={(e) => updateRow(r.key, { unit: e.target.value })} placeholder="cup" aria-label="Unit" autoCapitalize="none" />
                  <input className="field px-3" value={r.name} onChange={(e) => updateRow(r.key, { name: e.target.value })} placeholder="flour" aria-label="Ingredient" />
                  <input className="field col-span-3 px-3 md:col-span-1" value={r.note} onChange={(e) => updateRow(r.key, { note: e.target.value })} placeholder="note (sifted)" aria-label="Note" />
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
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="btn-ghost" onClick={() => setRows((rs) => [...rs, blankRow()])}>+ Ingredient</button>
          <button type="button" className="btn-ghost" onClick={() => setRows((rs) => [...rs, blankRow(true)])}>+ Section heading</button>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-2xl font-semibold">Method</h2>
        <ol className="mt-4 space-y-2">
          {steps.map((s, i) => (
            <li key={i} className="flex items-start gap-2 rounded-xl border border-line bg-card p-2">
              <span className="mt-2.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent font-bold text-accent-ink">
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
        <button type="button" className="btn-ghost mt-3" onClick={() => setSteps((st) => [...st, ""])}>+ Step</button>
      </section>

      <section className="mt-8">
        <label>
          <span className="font-display text-2xl font-semibold">Notes</span>
          <textarea className="field mt-3 min-h-28 py-3" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Tips, substitutions, storage…" />
        </label>
      </section>

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

function RowTools(props: { onUp: () => void; onDown: () => void; onRemove: () => void }) {
  const cls = "flex h-11 w-11 items-center justify-center rounded-lg text-lg text-muted active:bg-accent-soft";
  return (
    <div className="flex shrink-0 flex-col md:flex-row">
      <button type="button" className={cls} onClick={props.onUp} aria-label="Move up">↑</button>
      <button type="button" className={cls} onClick={props.onDown} aria-label="Move down">↓</button>
      <button type="button" className={cls} onClick={props.onRemove} aria-label="Remove">✕</button>
    </div>
  );
}

function DeleteButton({ id }: { id: number }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="btn text-accent"
      disabled={pending}
      onClick={() => {
        if (confirm("Delete this recipe? This can't be undone.")) start(() => deleteRecipeAction(id));
      }}
    >
      {pending ? "Deleting…" : "Delete recipe"}
    </button>
  );
}

// ---- Photo → recipe ----

const MAX_EDGE = 1600;
const MAX_PHOTOS = 4;
// Vercel rejects requests over 4.5 MB, so keep the photos well under that.
const MAX_UPLOAD_CHARS = 4_000_000;

/** Downscale a camera photo to a JPEG small enough to upload quickly. */
async function shrink(file: File): Promise<{ mediaType: "image/jpeg"; data: string }> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    return { mediaType: "image/jpeg", data: dataUrl.slice(dataUrl.indexOf(",") + 1) };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function PhotoImport({ onRecipe }: { onRecipe: (r: RecipeInput) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const run = () => {
    setError(null);
    start(async () => {
      try {
        setStatus("Preparing photos…");
        const photos = await Promise.all(files.map(shrink));
        if (photos.reduce((sum, p) => sum + p.data.length, 0) > MAX_UPLOAD_CHARS) {
          setError("Those photos are too large together. Try fewer pages at a time.");
          return;
        }
        setStatus("Reading the recipe… this can take up to a minute.");
        const result = await recipeFromPhotosAction(photos);
        if ("error" in result) setError(result.error);
        else {
          onRecipe(result.recipe);
          setFiles([]);
        }
      } catch {
        setError("Couldn't read that photo. Try another one.");
      } finally {
        setStatus(null);
      }
    });
  };

  return (
    <div className="mt-6 rounded-2xl border-2 border-dashed border-accent/40 bg-accent-soft p-5">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1">
          <h2 className="font-display text-xl font-semibold">📷 Fill in from a photo</h2>
          <p className="mt-1 text-sm text-muted">
            Snap a printed recipe or recipe card. Add more photos if it spans pages, then
            review what AI filled in before saving.
          </p>
        </div>
        <input
          ref={input}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            const picked = Array.from(e.target.files ?? []);
            setFiles((f) => [...f, ...picked].slice(0, MAX_PHOTOS));
            e.target.value = "";
          }}
        />
        <button
          type="button"
          className="btn-ghost"
          onClick={() => input.current?.click()}
          disabled={pending || files.length >= MAX_PHOTOS}
        >
          {files.length ? "Add another photo" : "Take or choose photo"}
        </button>
        {files.length > 0 && (
          <button type="button" className="btn-primary" onClick={run} disabled={pending}>
            {pending ? "Reading…" : `Fill recipe from ${files.length} photo${files.length > 1 ? "s" : ""}`}
          </button>
        )}
      </div>
      {files.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-3">
          {files.map((f, i) => (
            <li key={i} className="relative">
              <Thumb file={f} />
              {!pending && (
                <button
                  type="button"
                  aria-label="Remove photo"
                  onClick={() => setFiles((fs) => fs.filter((_, j) => j !== i))}
                  className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-ink text-sm text-paper"
                >
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {status && <p className="mt-3 animate-pulse font-semibold">{status}</p>}
      {error && <p className="mt-3 font-semibold text-accent">{error}</p>}
    </div>
  );
}

function Thumb({ file }: { file: File }) {
  const [src] = useState(() => URL.createObjectURL(file));
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" className="h-24 w-24 rounded-xl object-cover" />;
}
