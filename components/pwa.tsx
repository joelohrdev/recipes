"use client";

import { useOffline } from "next/offline";
import { useEffect } from "react";

/** Registers the service worker that lets the installed app work offline. */
export function ServiceWorker() {
  useEffect(() => {
    // Only in production builds: a caching worker gets in the way while developing.
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch((error) => console.warn("Service worker registration failed:", error));
  }, []);
  return null;
}

/**
 * Shows a note while offline. In-app links normally fetch fresh data, which
 * can't finish offline, so while offline they become full page loads that the
 * service worker answers with the saved copy.
 */
export function OfflineBanner() {
  const offline = useOffline();

  useEffect(() => {
    if (!offline) return;
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey) return;
      const link = (event.target as Element | null)?.closest("a[href]");
      if (!(link instanceof HTMLAnchorElement) || link.target === "_blank") return;
      const url = new URL(link.href);
      if (url.origin !== location.origin) return;
      event.preventDefault();
      event.stopPropagation();
      location.assign(url.href);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [offline]);

  if (!offline) return null;
  return (
    <div role="status" className="border-b border-line bg-butter text-[#1c2b4b]">
      <p className="mx-auto max-w-6xl px-5 py-2.5 font-semibold">
        You’re offline. Saved recipes still open; changes wait until you’re back online.
      </p>
    </div>
  );
}

/** Asks the service worker to keep every recipe and its photo for offline use. */
export function SaveForOffline({
  recipes,
}: {
  recipes: { id: number; updatedAt: string; imageUrl: string }[];
}) {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let cancelled = false;
    navigator.serviceWorker.ready.then((registration) => {
      if (cancelled) return;
      registration.active?.postMessage({
        type: "save-for-offline",
        pages: recipes.map((r) => ({ url: `/recipes/${r.id}`, version: r.updatedAt })),
        photos: recipes.map((r) => r.imageUrl).filter((u) => u.startsWith("/photos/")),
      });
    });
    return () => {
      cancelled = true;
    };
  }, [recipes]);
  return null;
}
