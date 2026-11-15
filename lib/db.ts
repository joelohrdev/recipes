import "server-only";
import { createClient, type Client, type Row } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";
import type { Recipe, RecipeInput, RecipeSummary } from "./types";

// Recipes live in Turso (hosted SQLite). Without TURSO_DATABASE_URL, local
// development falls back to a SQLite file at data/recipes.db.

function connect(): Client {
  const url = process.env.TURSO_DATABASE_URL;
  if (url) {
    return createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  }
  if (process.env.VERCEL) {
    throw new Error("Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in Vercel.");
  }
  const file = path.join(process.cwd(), "data", "recipes.db");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  return createClient({ url: `file:${file}` });
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS recipes (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    title          TEXT NOT NULL,
    description    TEXT NOT NULL DEFAULT '',
    servings       REAL,
    servings_label TEXT NOT NULL DEFAULT 'servings',
    prep_minutes   INTEGER,
    cook_minutes   INTEGER,
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
    result      TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

// One client per server process (and across hot reloads in development).
// The tables are created on first use, so a new Turso database needs no setup.
const globalForDb = globalThis as unknown as { recipeDb?: Promise<Client> };

function db(): Promise<Client> {
  if (!globalForDb.recipeDb) {
    globalForDb.recipeDb = (async () => {
      const client = connect();
      await client.executeMultiple(SCHEMA);
      return client;
    })().catch((error) => {
      globalForDb.recipeDb = undefined; // retry on the next request
      throw error;
    });
  }
  return globalForDb.recipeDb;
}

function toRecipe(row: Row): Recipe {
  return {
    id: Number(row.id),
    title: String(row.title),
    description: String(row.description),
    servings: row.servings === null ? null : Number(row.servings),
    servingsLabel: String(row.servings_label),
    prepMinutes: row.prep_minutes === null ? null : Number(row.prep_minutes),
    cookMinutes: row.cook_minutes === null ? null : Number(row.cook_minutes),
    sourceUrl: String(row.source_url),
    notes: String(row.notes),
    tags: JSON.parse(String(row.tags)),
    ingredients: JSON.parse(String(row.ingredients)),
    steps: JSON.parse(String(row.steps)),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
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
    source_url: r.sourceUrl,
    notes: r.notes,
    tags: JSON.stringify(r.tags),
    ingredients: JSON.stringify(r.ingredients),
    steps: JSON.stringify(r.steps),
  };
}

export async function listRecipes(): Promise<RecipeSummary[]> {
  const { rows } = await (await db()).execute(
    "SELECT * FROM recipes ORDER BY title COLLATE NOCASE",
  );
  return rows.map((row) => {
    const r = toRecipe(row);
    return {
      id: r.id,
      title: r.title,
      description: r.description,
      tags: r.tags,
      prepMinutes: r.prepMinutes,
      cookMinutes: r.cookMinutes,
      servings: r.servings,
      servingsLabel: r.servingsLabel,
    };
  });
}

export async function findRecipe(id: number): Promise<Recipe | null> {
  const { rows } = await (await db()).execute({
    sql: "SELECT * FROM recipes WHERE id = ?",
    args: [id],
  });
  return rows[0] ? toRecipe(rows[0]) : null;
}

export async function insertRecipe(r: RecipeInput): Promise<number> {
  const result = await (await db()).execute({
    sql: `INSERT INTO recipes (title, description, servings, servings_label, prep_minutes,
            cook_minutes, source_url, notes, tags, ingredients, steps)
          VALUES (:title, :description, :servings, :servings_label, :prep_minutes,
            :cook_minutes, :source_url, :notes, :tags, :ingredients, :steps)`,
    args: toParams(r),
  });
  return Number(result.lastInsertRowid);
}

export async function updateRecipeRow(id: number, r: RecipeInput) {
  await (await db()).execute({
    sql: `UPDATE recipes SET title=:title, description=:description, servings=:servings,
            servings_label=:servings_label, prep_minutes=:prep_minutes, cook_minutes=:cook_minutes,
            source_url=:source_url, notes=:notes, tags=:tags,
            ingredients=:ingredients, steps=:steps, updated_at=datetime('now')
          WHERE id=:id`,
    args: { ...toParams(r), id },
  });
}

export async function deleteRecipeRow(id: number) {
  await (await db()).execute({ sql: "DELETE FROM recipes WHERE id = ?", args: [id] });
}

// ---- Web imports (bookmarklet) ----

export type WebImport = {
  id: string;
  url: string;
  title: string;
  pageText: string;
  structured: string;
  result: RecipeInput | null;
};

export async function insertWebImport(i: Omit<WebImport, "result">) {
  // Pending imports are only useful for a short while.
  await (await db()).batch(
    [
      "DELETE FROM web_imports WHERE created_at < datetime('now', '-2 days')",
      {
        sql: `INSERT INTO web_imports (id, url, title, page_text, structured)
              VALUES (:id, :url, :title, :pageText, :structured)`,
        args: i,
      },
    ],
    "write",
  );
}

export async function findWebImport(id: string): Promise<WebImport | null> {
  const { rows } = await (await db()).execute({
    sql: "SELECT * FROM web_imports WHERE id = ?",
    args: [id],
  });
  const row = rows[0];
  if (!row) return null;
  return {
    id: String(row.id),
    url: String(row.url),
    title: String(row.title),
    pageText: String(row.page_text),
    structured: String(row.structured),
    result: row.result ? JSON.parse(String(row.result)) : null,
  };
}

export async function saveWebImportResult(id: string, result: RecipeInput) {
  await (await db()).execute({
    sql: "UPDATE web_imports SET result = ? WHERE id = ?",
    args: [JSON.stringify(result), id],
  });
}

export async function deleteWebImport(id: string) {
  await (await db()).execute({ sql: "DELETE FROM web_imports WHERE id = ?", args: [id] });
}
