import "server-only";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import type { Recipe, RecipeInput, RecipeSummary } from "./types";

const dbPath =
  process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "recipes.db");

// Reuse one connection across hot reloads in development.
const globalForDb = globalThis as unknown as { recipeDb?: Database.Database };

function open() {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS recipes (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      title          TEXT NOT NULL,
      description    TEXT NOT NULL DEFAULT '',
      servings       REAL,
      servings_label TEXT NOT NULL DEFAULT 'servings',
      prep_minutes   INTEGER,
      cook_minutes   INTEGER,
      image_url      TEXT NOT NULL DEFAULT '',
      source_url     TEXT NOT NULL DEFAULT '',
      notes          TEXT NOT NULL DEFAULT '',
      tags           TEXT NOT NULL DEFAULT '[]',
      ingredients    TEXT NOT NULL DEFAULT '[]',
      steps          TEXT NOT NULL DEFAULT '[]',
      created_at     TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Pages sent by the browser bookmarklet, waiting to be turned into a recipe.
    CREATE TABLE IF NOT EXISTS web_imports (
      id          TEXT PRIMARY KEY,
      url         TEXT NOT NULL,
      title       TEXT NOT NULL DEFAULT '',
      page_text   TEXT NOT NULL,
      structured  TEXT NOT NULL DEFAULT '',
      image_url   TEXT NOT NULL DEFAULT '',
      result      TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  return db;
}

export const db = globalForDb.recipeDb ?? open();
if (process.env.NODE_ENV !== "production") globalForDb.recipeDb = db;

type RecipeRow = {
  id: number;
  title: string;
  description: string;
  servings: number | null;
  servings_label: string;
  prep_minutes: number | null;
  cook_minutes: number | null;
  image_url: string;
  source_url: string;
  notes: string;
  tags: string;
  ingredients: string;
  steps: string;
  created_at: string;
  updated_at: string;
};

function toRecipe(row: RecipeRow): Recipe {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    servings: row.servings,
    servingsLabel: row.servings_label,
    prepMinutes: row.prep_minutes,
    cookMinutes: row.cook_minutes,
    imageUrl: row.image_url,
    sourceUrl: row.source_url,
    notes: row.notes,
    tags: JSON.parse(row.tags),
    ingredients: JSON.parse(row.ingredients),
    steps: JSON.parse(row.steps),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toParams(r: RecipeInput) {
  return {
    title: r.title,
    description: r.description,
    servings: r.servings,
    servings_label: r.servingsLabel || "servings",
    prep_minutes: r.prepMinutes,
    cook_minutes: r.cookMinutes,
    image_url: r.imageUrl,
    source_url: r.sourceUrl,
    notes: r.notes,
    tags: JSON.stringify(r.tags),
    ingredients: JSON.stringify(r.ingredients),
    steps: JSON.stringify(r.steps),
  };
}

export function listRecipes(): RecipeSummary[] {
  const rows = db
    .prepare("SELECT * FROM recipes ORDER BY title COLLATE NOCASE")
    .all() as RecipeRow[];
  return rows.map((row) => {
    const r = toRecipe(row);
    return {
      id: r.id,
      title: r.title,
      description: r.description,
      imageUrl: r.imageUrl,
      tags: r.tags,
      prepMinutes: r.prepMinutes,
      cookMinutes: r.cookMinutes,
      servings: r.servings,
      servingsLabel: r.servingsLabel,
    };
  });
}

export function findRecipe(id: number): Recipe | null {
  const row = db.prepare("SELECT * FROM recipes WHERE id = ?").get(id) as
    | RecipeRow
    | undefined;
  return row ? toRecipe(row) : null;
}

export function insertRecipe(r: RecipeInput): number {
  const result = db
    .prepare(
      `INSERT INTO recipes (title, description, servings, servings_label, prep_minutes,
         cook_minutes, image_url, source_url, notes, tags, ingredients, steps)
       VALUES (@title, @description, @servings, @servings_label, @prep_minutes,
         @cook_minutes, @image_url, @source_url, @notes, @tags, @ingredients, @steps)`,
    )
    .run(toParams(r));
  return Number(result.lastInsertRowid);
}

export function updateRecipeRow(id: number, r: RecipeInput) {
  db.prepare(
    `UPDATE recipes SET title=@title, description=@description, servings=@servings,
       servings_label=@servings_label, prep_minutes=@prep_minutes, cook_minutes=@cook_minutes,
       image_url=@image_url, source_url=@source_url, notes=@notes, tags=@tags,
       ingredients=@ingredients, steps=@steps, updated_at=datetime('now')
     WHERE id=@id`,
  ).run({ ...toParams(r), id });
}

export function deleteRecipeRow(id: number) {
  db.prepare("DELETE FROM recipes WHERE id = ?").run(id);
}

// ---- Web imports (bookmarklet) ----

export type WebImport = {
  id: string;
  url: string;
  title: string;
  pageText: string;
  structured: string;
  imageUrl: string;
  result: RecipeInput | null;
};

export function insertWebImport(i: Omit<WebImport, "result">) {
  // Pending imports are only useful for a short while.
  db.prepare(
    "DELETE FROM web_imports WHERE created_at < datetime('now', '-2 days')",
  ).run();
  db.prepare(
    `INSERT INTO web_imports (id, url, title, page_text, structured, image_url)
     VALUES (@id, @url, @title, @pageText, @structured, @imageUrl)`,
  ).run(i);
}

export function findWebImport(id: string): WebImport | null {
  const row = db.prepare("SELECT * FROM web_imports WHERE id = ?").get(id) as
    | {
        id: string;
        url: string;
        title: string;
        page_text: string;
        structured: string;
        image_url: string;
        result: string | null;
      }
    | undefined;
  if (!row) return null;
  return {
    id: row.id,
    url: row.url,
    title: row.title,
    pageText: row.page_text,
    structured: row.structured,
    imageUrl: row.image_url,
    result: row.result ? JSON.parse(row.result) : null,
  };
}

export function saveWebImportResult(id: string, result: RecipeInput) {
  db.prepare("UPDATE web_imports SET result = ? WHERE id = ?").run(
    JSON.stringify(result),
    id,
  );
}

export function deleteWebImport(id: string) {
  db.prepare("DELETE FROM web_imports WHERE id = ?").run(id);
}
