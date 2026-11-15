import { BookmarkletSetup } from "@/components/bookmarklet-setup";

export const metadata = { title: "Browser button" };

export default function BookmarkletPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-4xl font-semibold">Save recipes from any website</h1>
      <p className="mt-3 text-lg text-muted">
        Add a bookmark that sends the page you&apos;re on to your Recipe Box. AI reads the
        page, fills in a new recipe, and you check it before saving.
      </p>
      <BookmarkletSetup />
    </div>
  );
}
