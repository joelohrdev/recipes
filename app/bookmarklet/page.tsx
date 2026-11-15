import { BookmarkletSetup } from "@/components/bookmarklet-setup";

export const metadata = { title: "Save from the web" };

export default function BookmarkletPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-slab text-[2.75rem] font-bold leading-[1.05] tracking-tight">
        Save recipes from any website
      </h1>
      <p className="mt-4 max-w-[60ch] text-lg text-ink-soft">
        Add a bookmark once. On a recipe page, tap it and the recipe is read into a new card for
        you to check and save. The page’s photo comes along too.
      </p>
      <BookmarkletSetup />
    </div>
  );
}
