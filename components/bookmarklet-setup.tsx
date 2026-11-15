"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

/** The bookmarklet posts the current page's text and recipe data to /api/import. */
function buildBookmarklet(origin: string) {
  const code = `(function(){
var d=document,f=d.createElement('form');
f.method='POST';f.action=${JSON.stringify(origin + "/api/import")};f.acceptCharset='UTF-8';
function a(n,v){var i=d.createElement('textarea');i.name=n;i.value=v||'';f.appendChild(i);}
var s=[].map.call(d.querySelectorAll('script[type="application/ld+json"]'),function(x){return x.textContent}).join('\\n');
var m=d.querySelector('meta[property="og:image"]');
a('url',location.href);a('title',d.title);a('structured',s.slice(0,60000));
a('image',m?m.content:'');a('text',(d.body.innerText||'').slice(0,120000));
f.style.display='none';d.body.appendChild(f);f.submit();
})();`;
  return "javascript:" + encodeURIComponent(code.replace(/\n/g, ""));
}

export function BookmarkletSetup() {
  const origin = useSyncExternalStore(
    noopSubscribe,
    () => window.location.origin,
    () => "",
  );
  const href = origin ? buildBookmarklet(origin) : "";
  const [copied, setCopied] = useState(false);
  const link = useRef<HTMLAnchorElement>(null);

  // React blocks javascript: URLs in href, so set the attribute directly.
  useEffect(() => {
    if (href && link.current) link.current.setAttribute("href", href);
  }, [href]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="mt-8 space-y-6">
      <section className="rounded-2xl border border-line bg-card p-6">
        <h2 className="font-display text-2xl font-semibold">On iPad (Safari)</h2>
        <ol className="mt-4 list-decimal space-y-3 pl-6 text-lg">
          <li>
            <button onClick={copy} className="btn-primary" disabled={!href}>
              {copied ? "✓ Copied" : "Copy bookmark code"}
            </button>
          </li>
          <li>
            Tap the <b>Share</b> button in Safari and choose <b>Add Bookmark</b>. Name it{" "}
            <b>Save recipe</b> and save it to <b>Favorites</b>.
          </li>
          <li>
            Open the bookmarks sidebar, press and hold <b>Save recipe</b>, choose{" "}
            <b>Edit</b>, clear the address field and paste the code you copied.
          </li>
          <li>
            On a recipe website, tap <b>Save recipe</b> in your Favorites bar. You&apos;ll land
            on a filled-in recipe to review.
          </li>
        </ol>
      </section>

      <section className="rounded-2xl border border-line bg-card p-6">
        <h2 className="font-display text-2xl font-semibold">On a computer</h2>
        <p className="mt-3 text-lg">Drag this button onto your bookmarks bar:</p>
        <a
          ref={link}
          onClick={(e) => {
            e.preventDefault();
            alert("Drag this button to your bookmarks bar instead of clicking it.");
          }}
          className="btn-primary mt-4 cursor-grab"
        >
          🍳 Save recipe
        </a>
      </section>

      <p className="text-sm text-muted">
        The first time you use it on a device you&apos;ll be asked for your passcode. The
        bookmark only works while this app is reachable at{" "}
        <code className="rounded bg-accent-soft px-1.5 py-0.5">{origin || "…"}</code>.
      </p>
    </div>
  );
}

const noopSubscribe = () => () => {};
