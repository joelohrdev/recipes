"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Bookmark, Check, Copy } from "./icons";

/** The bookmarklet posts the current page's text and recipe data to /api/import. */
function buildBookmarklet(origin: string) {
  const code = `(function(){
var d=document,f=d.createElement('form');
f.method='POST';f.action=${JSON.stringify(origin + "/api/import")};f.acceptCharset='UTF-8';
function a(n,v){var i=d.createElement('textarea');i.name=n;i.value=v||'';f.appendChild(i);}
var m=d.querySelector('meta[property="og:image"]');
var s=[].map.call(d.querySelectorAll('script[type="application/ld+json"]'),function(x){return x.textContent}).join('\\n');
a('url',location.href);a('image',m?m.content:'');a('title',d.title);a('structured',s.slice(0,60000));
a('text',(d.body.innerText||'').slice(0,120000));
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

  const steps: React.ReactNode[] = [
    <>
      <button onClick={copy} className="btn-primary" disabled={!href}>
        {copied ? <Check /> : <Copy />}
        {copied ? "Copied" : "Copy the bookmark code"}
      </button>
    </>,
    <>
      In Safari, tap <b>Share</b>, then <b>Add Bookmark</b>. Name it <b>Save recipe</b> and
      put it in <b>Favorites</b>.
    </>,
    <>
      Open the bookmarks sidebar, press and hold <b>Save recipe</b>, and choose <b>Edit</b>.
      Replace the address with the code you copied.
    </>,
    <>
      On any recipe page, tap <b>Save recipe</b> in the Favorites bar.
    </>,
  ];

  return (
    <div className="mt-10">
      <h2 className="font-slab text-2xl font-bold">On the iPad</h2>
      <ol className="mt-4 border-t border-line">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-5 border-b border-line py-5 text-[1.125rem] leading-relaxed">
            <span className="w-8 shrink-0 text-center text-[1.375rem] font-bold text-cobalt">
              {i + 1}
            </span>
            <div className="pt-1">{step}</div>
          </li>
        ))}
      </ol>

      <h2 className="mt-12 font-slab text-2xl font-bold">On a computer</h2>
      <p className="mt-2 text-[1.125rem]">Drag this button onto your bookmarks bar.</p>
      <a
        ref={link}
        onClick={(e) => {
          e.preventDefault();
          alert("Drag this button onto your bookmarks bar rather than clicking it.");
        }}
        className="btn-primary mt-4 cursor-grab"
      >
        <Bookmark />
        Save recipe
      </a>

      <p className="mt-12 border-l-4 border-rule pl-4 text-[0.9375rem] text-ink-soft">
        The first time you use it on a device, you’ll be asked for the passcode. The bookmark
        sends pages to <span className="font-semibold text-ink">{origin || "this app"}</span>, so
        set it up again if the app’s address changes.
      </p>
    </div>
  );
}

const noopSubscribe = () => () => {};
