import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, Zilla_Slab } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { LockStatus } from "@/components/lock-status";
import { Bookmark, Mark, Plus } from "@/components/icons";
import { OfflineBanner, ServiceWorker } from "@/components/pwa";
import "./globals.css";

// Atkinson Hyperlegible was drawn for low-vision readers: it holds up when the
// iPad is propped at the back of the counter. Zilla Slab gives titles a typed,
// label-like voice.
const body = Atkinson_Hyperlegible_Next({ variable: "--font-body", subsets: ["latin"] });
const slab = Zilla_Slab({
  variable: "--font-slab",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: { default: "Recipe Box", template: "%s | Recipe Box" },
  description: "Family recipes, scaled to any table.",
  appleWebApp: { title: "Recipes", capable: true, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef1ec" },
    { media: "(prefers-color-scheme: dark)", color: "#101a2e" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${body.variable} ${slab.variable} antialiased`}>
      <body className="min-h-dvh font-sans">
        <ServiceWorker />
        <OfflineBanner />
        <header className="border-b border-line">
          <div className="mx-auto flex h-[4.5rem] max-w-6xl items-center gap-1 px-4 sm:gap-2 sm:px-5">
            <Link href="/" className="mr-auto flex items-center gap-2.5 rounded-md">
              <Mark className="h-9 w-9" />
              <span className="whitespace-nowrap font-slab text-[1.625rem] font-bold leading-none tracking-tight max-[380px]:text-[1.375rem]">
                Recipe Box
              </span>
            </Link>
            <Link href="/bookmarklet" className="btn-quiet max-sm:px-3" aria-label="Save from the web">
              <Bookmark />
              <span className="max-sm:hidden">Save from the web</span>
            </Link>
            <Suspense fallback={null}>
              <LockStatus />
            </Suspense>
            <Link href="/recipes/new" className="btn-primary whitespace-nowrap max-sm:px-3.5">
              <Plus />
              Add<span className="max-sm:hidden"> recipe</span>
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-5 pb-24 pt-8">{children}</main>
      </body>
    </html>
  );
}
