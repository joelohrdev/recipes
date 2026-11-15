// Chooses dinners for the week so the same few don't keep coming back.
//
// Every recipe gets a score: how many days since it was last planned (never
// planned scores highest), plus a random nudge of up to three weeks so the
// picks vary even when nothing has been planned yet. The highest scores win.
// Dinners planned close by come next, and picks being thrown out come last,
// so they only return when there aren't enough other recipes.

export type Candidate = {
  id: number;
  tags: string[];
  /** Date (YYYY-MM-DD) this recipe was last planned for, or null if never. */
  lastHad: string | null;
};

const DINNER_TAGS = new Set([
  "dinner", "dinners", "supper", "main", "mains", "main course", "main courses",
  "main dish", "main dishes", "entree", "entrees", "entrée", "entrées",
]);

const NOT_DINNER_TAGS = new Set([
  "dessert", "desserts", "breakfast", "brunch", "baking", "cookies", "cake", "cakes",
  "snack", "snacks", "drink", "drinks", "cocktail", "cocktails", "sauce", "sauces",
  "dip", "dips", "bread", "condiment", "condiments",
]);

const NEVER_HAD_DAYS = 150;
const MAX_DAYS = 120;
const RANDOM_DAYS = 21;

/**
 * Recipes tagged as dinner when there are enough of them; otherwise every
 * recipe that isn't clearly something else (dessert, breakfast, drinks…).
 */
export function dinnerPool(recipes: Candidate[], needed: number): Candidate[] {
  const tagged = (r: Candidate, set: Set<string>) =>
    r.tags.some((t) => set.has(t.trim().toLowerCase()));
  const dinners = recipes.filter((r) => tagged(r, DINNER_TAGS));
  if (dinners.length >= needed) return dinners;
  const likely = recipes.filter((r) => tagged(r, DINNER_TAGS) || !tagged(r, NOT_DINNER_TAGS));
  return likely.length > 0 ? likely : recipes;
}

export function chooseDinners(options: {
  pool: Candidate[];
  count: number;
  /** The date the picks are for, used to measure how long ago each was had. */
  on: string;
  /** Planned close by (last week, or other nights this week): used only if needed. */
  recent?: Set<number>;
  /** Picks being thrown out: used only as a last resort. */
  rejected?: Set<number>;
  random?: () => number;
}): number[] {
  const { pool, count, on, recent = new Set(), rejected = new Set(), random = Math.random } = options;
  return pool
    .map((r) => {
      const days = r.lastHad ? Math.min(MAX_DAYS, daysBetween(r.lastHad, on)) : NEVER_HAD_DAYS;
      const penalty = rejected.has(r.id) ? 2000 : recent.has(r.id) ? 1000 : 0;
      return { id: r.id, score: days + random() * RANDOM_DAYS - penalty };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((r) => r.id);
}

// ---- Calendar dates as YYYY-MM-DD strings ----

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isDate(value: unknown): value is string {
  if (typeof value !== "string" || !DATE.test(value)) return false;
  return toDateString(new Date(`${value}T00:00:00Z`)) === value;
}

export function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return toDateString(d);
}

export function daysBetween(from: string, to: string) {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000,
  );
}

function toDateString(d: Date) {
  return d.toISOString().slice(0, 10);
}
