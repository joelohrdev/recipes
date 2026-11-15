import Link from "next/link";

export const metadata = { title: "Offline" };

// Shown by the service worker when a page hasn't been saved for offline use.
export default function OfflinePage() {
  return (
    <div className="mx-auto mt-6 max-w-md">
      <div className="index-card w-48 rotate-[-2deg] px-5 pb-6 pt-5" aria-hidden="true">
        <div className="h-1 rounded bg-margin" />
        <div className="mt-5 h-1 rounded bg-rule" />
        <div className="mt-5 h-1 w-4/5 rounded bg-rule" />
      </div>
      <h1 className="mt-8 font-slab text-[2.5rem] font-bold leading-tight">This page isn’t saved</h1>
      <p className="mt-3 text-lg text-ink-soft">
        You’re offline, and this page wasn’t saved on this device. Recipes are saved
        automatically each time you open your recipe list with a connection.
      </p>
      <Link href="/" className="btn-primary mt-8">
        Open saved recipes
      </Link>
    </div>
  );
}
