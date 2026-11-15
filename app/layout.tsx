import type { Metadata, Viewport } from "next";
import { Fraunces, Nunito_Sans } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { LockStatus } from "@/components/lock-status";
import "./globals.css";

const display = Fraunces({ variable: "--font-display", subsets: ["latin"] });
const body = Nunito_Sans({ variable: "--font-body", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Recipe Box", template: "%s · Recipe Box" },
  description: "Family recipes, scaled to any table.",
  appleWebApp: { title: "Recipes", capable: true, statusBarStyle: "default" },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf6ef" },
    { media: "(prefers-color-scheme: dark)", color: "#1b1714" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} antialiased`}>
      <body className="min-h-dvh font-sans">
        <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-5">
            <Link href="/" className="font-display text-2xl font-semibold tracking-tight">
              Recipe Box
            </Link>
            <nav className="ml-auto flex items-center gap-2">
              <Link href="/bookmarklet" className="btn px-4 text-sm text-muted">
                Browser button
              </Link>
              <Suspense fallback={null}>
                <LockStatus />
              </Suspense>
              <Link href="/recipes/new" className="btn-primary">
                <span aria-hidden className="text-xl leading-none">+</span> Add recipe
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-5 pb-24 pt-6">{children}</main>
      </body>
    </html>
  );
}
