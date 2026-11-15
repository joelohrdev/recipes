import { z } from "zod";

/**
 * One line of an ingredient list. Quantities are stored as numbers so they can
 * be scaled; `quantityMax` holds the upper end of a range like "2–3 cloves".
 * A row with `isHeading` is a section label ("For the sauce") with no amount.
 */
export const IngredientSchema = z.object({
  quantity: z.number().nullable(),
  quantityMax: z.number().nullable(),
  unit: z.string(),
  name: z.string(),
  note: z.string(),
  isHeading: z.boolean(),
});

export const RecipeInputSchema = z.object({
  title: z.string(),
  description: z.string(),
  servings: z.number().nullable(),
  servingsLabel: z.string(),
  prepMinutes: z.number().nullable(),
  cookMinutes: z.number().nullable(),
  imageUrl: z.string(),
  sourceUrl: z.string(),
  notes: z.string(),
  tags: z.array(z.string()),
  ingredients: z.array(IngredientSchema),
  steps: z.array(z.string()),
});

export type Ingredient = z.infer<typeof IngredientSchema>;
export type RecipeInput = z.infer<typeof RecipeInputSchema>;

export type Recipe = RecipeInput & {
  id: number;
  createdAt: string;
  updatedAt: string;
};

export type RecipeSummary = Pick<
  Recipe,
  | "id"
  | "title"
  | "description"
  | "imageUrl"
  | "tags"
  | "prepMinutes"
  | "cookMinutes"
  | "servings"
  | "servingsLabel"
  | "updatedAt"
>;

export const emptyRecipe: RecipeInput = {
  title: "",
  description: "",
  servings: 4,
  servingsLabel: "servings",
  prepMinutes: null,
  cookMinutes: null,
  imageUrl: "",
  sourceUrl: "",
  notes: "",
  tags: [],
  ingredients: [],
  steps: [],
};
