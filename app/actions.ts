"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { isUnlocked, lock, passcodeMatches, requireUnlocked, unlock } from "@/lib/auth";
import { randomUUID } from "node:crypto";
import {
  deletePhotoIfUnused,
  deleteRecipeRow,
  deleteWebImport,
  findRecipe,
  insertPhoto,
  insertRecipe,
  updateRecipeRow,
} from "@/lib/db";
import { copyRemoteImage } from "@/lib/remote-image";
import { ExtractionError, recipeFromPhotos, type PhotoInput } from "@/lib/ai";
import { RecipeInputSchema, type RecipeInput } from "@/lib/types";

// ---- Passcode ----

// Slow down guessing: a small in-memory tally of recent failures.
const failures: number[] = [];

export async function loginAction(
  _prev: { error: string } | null,
  formData: FormData,
): Promise<{ error: string }> {
  const now = Date.now();
  while (failures.length && failures[0] < now - 15 * 60 * 1000) failures.shift();
  if (failures.length >= 10) {
    return { error: "Too many wrong tries. Wait 15 minutes and try again." };
  }

  const passcode = String(formData.get("passcode") ?? "");
  const next = safeNext(String(formData.get("next") ?? "/"));
  if (!passcodeMatches(passcode)) {
    failures.push(now);
    await new Promise((r) => setTimeout(r, 600));
    return { error: "That passcode didn’t match. Try again." };
  }
  await unlock();
  redirect(next);
}

export async function logoutAction() {
  await lock();
  redirect("/");
}

function safeNext(next: string) {
  // Only allow redirects back into this app.
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

// ---- Recipes ----

export type SaveResult = { error: string } | null;

export async function saveRecipeAction(
  id: number | null,
  recipe: RecipeInput,
  importId?: string,
): Promise<SaveResult> {
  if (!(await isUnlocked())) return { error: "Locked. Enter the passcode again." };

  const parsed = RecipeInputSchema.safeParse(recipe);
  if (!parsed.success) return { error: "Some fields are invalid." };
  const data = clean(parsed.data);
  if (!data.title) return { error: "Give the recipe a title." };

  // Keep our own copy of website pictures instead of linking to other sites.
  if (/^https?:\/\//.test(data.imageUrl)) {
    data.imageUrl = (await copyRemoteImage(data.imageUrl)) ?? "";
  }

  let recipeId = id;
  if (recipeId === null) {
    recipeId = await insertRecipe(data);
  } else {
    const before = await findRecipe(recipeId);
    await updateRecipeRow(recipeId, data);
    if (before && before.imageUrl !== data.imageUrl) await deletePhotoIfUnused(before.imageUrl);
  }
  if (importId) await deleteWebImport(importId);
  updateTag("recipes");
  redirect(`/recipes/${recipeId}`);
}

export async function deleteRecipeAction(id: number) {
  await requireUnlocked(`/recipes/${id}/edit`);
  const recipe = await findRecipe(id);
  await deleteRecipeRow(id);
  if (recipe) await deletePhotoIfUnused(recipe.imageUrl);
  updateTag("recipes");
  redirect("/");
}

function isImageUrl(url: string) {
  return /^https?:\/\//.test(url) || /^\/photos\/[0-9a-f-]{36}$/.test(url);
}

function clean(r: RecipeInput): RecipeInput {
  return {
    ...r,
    title: r.title.trim(),
    description: r.description.trim(),
    notes: r.notes.trim(),
    imageUrl: isImageUrl(r.imageUrl.trim()) ? r.imageUrl.trim() : "",
    sourceUrl: /^https?:\/\//.test(r.sourceUrl.trim()) ? r.sourceUrl.trim() : "",
    tags: [...new Set(r.tags.map((t) => t.trim().toLowerCase()).filter(Boolean))],
    ingredients: r.ingredients
      .map((i) => ({ ...i, name: i.name.trim(), unit: i.unit.trim(), note: i.note.trim() }))
      .filter((i) => i.name),
    steps: r.steps.map((s) => s.trim()).filter(Boolean),
  };
}

// ---- AI photo import ----

export async function recipeFromPhotosAction(
  photos: PhotoInput[],
): Promise<{ recipe: RecipeInput } | { error: string }> {
  if (!(await isUnlocked())) return { error: "Locked. Enter the passcode again." };
  if (photos.length === 0 || photos.length > 8) {
    return { error: "Add between 1 and 8 photos." };
  }
  if (!photos.every((p) => ["image/jpeg", "image/png", "image/webp"].includes(p.mediaType))) {
    return { error: "That photo type isn't supported. Use a JPEG, PNG or HEIC photo." };
  }
  if (!photos.every(isUsableImage)) {
    return { error: "A photo came through empty. Remove it and add it again." };
  }
  try {
    return { recipe: await recipeFromPhotos(photos) };
  } catch (error) {
    if (error instanceof ExtractionError) return { error: error.message };
    console.error(error);
    return { error: "Something went wrong reading the photo." };
  }
}

/** Rejects empty or corrupt uploads before they're sent to Claude or stored. */
function isUsableImage(photo: PhotoInput) {
  if (typeof photo.data !== "string" || photo.data.length < 1_000) return false;
  const bytes = Buffer.from(photo.data.slice(0, 16), "base64");
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
  const png = bytes[0] === 0x89 && bytes[1] === 0x50;
  const webp = bytes.subarray(8, 12).toString("ascii") === "WEBP";
  return jpeg || png || webp;
}

// ---- Dish photo upload ----

const MAX_PHOTO_BYTES = 1_500_000;

export async function uploadPhotoAction(
  photo: PhotoInput,
): Promise<{ url: string } | { error: string }> {
  if (!(await isUnlocked())) return { error: "Locked. Enter the passcode again." };
  if (photo.mediaType !== "image/jpeg") {
    return { error: "That photo type isn't supported. Use a JPEG, PNG or HEIC photo." };
  }
  if (!isUsableImage(photo)) return { error: "The photo came through empty. Try choosing it again." };
  const data = Buffer.from(photo.data, "base64");
  if (data.length === 0 || data.length > MAX_PHOTO_BYTES) {
    return { error: "That photo is too large." };
  }
  const id = randomUUID();
  await insertPhoto(id, photo.mediaType, new Uint8Array(data));
  return { url: `/photos/${id}` };
}
