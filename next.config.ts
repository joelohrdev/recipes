import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    agentFeedback: true,
    // Keeps page changes and saves pending (and retries them) while offline.
    useOffline: true,
    serverActions: {
      // Matches Vercel's 4.5 MB request limit; photos are shrunk in the browser.
      bodySizeLimit: "4.5mb",
    },
  },
  cacheComponents: true,
  partialPrefetching: true,
  async headers() {
    return [
      {
        // The service worker must never be cached, or updates would never arrive.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
  serverExternalPackages: ["@libsql/client", "libsql"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
