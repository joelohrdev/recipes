import "server-only";
import { randomUUID } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import sharp from "sharp";
import { insertPhoto } from "./db";

// Copies a picture from a recipe website into our own photo storage, so the
// recipe keeps its picture even if the original site changes or goes away.

const MAX_DOWNLOAD_BYTES = 15_000_000;
const MAX_EDGE = 1400;

function isPrivateAddress(ip: string) {
  if (isIP(ip) === 6) {
    const v6 = ip.toLowerCase();
    if (v6.startsWith("::ffff:")) return isPrivateAddress(v6.slice(7));
    return v6 === "::1" || v6 === "::" || /^f[cd]/.test(v6) || /^fe[89ab]/.test(v6);
  }
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

/** Only fetch public https addresses, never machines on our own network. */
async function assertPublicHttps(url: URL) {
  if (url.protocol !== "https:") throw new Error("Not https");
  const addresses = await lookup(url.hostname, { all: true });
  if (addresses.length === 0 || addresses.some((a) => isPrivateAddress(a.address))) {
    throw new Error("Not a public address");
  }
}

async function download(url: string): Promise<Buffer> {
  let current = new URL(url);
  // Follow redirects by hand so every hop gets the public-address check.
  for (let hop = 0; hop < 4; hop++) {
    await assertPublicHttps(current);
    const response = await fetch(current, {
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
      // Some sites refuse requests that don't look like a browser.
      headers: {
        Accept: "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
      },
    });
    if (response.status >= 300 && response.status < 400) {
      const next = response.headers.get("location");
      if (!next) throw new Error("Redirect without location");
      current = new URL(next, current);
      continue;
    }
    if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
    if (!(response.headers.get("content-type") ?? "").startsWith("image/")) {
      throw new Error("Not an image");
    }
    const chunks: Uint8Array[] = [];
    let size = 0;
    const reader = response.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_DOWNLOAD_BYTES) {
        await reader.cancel();
        throw new Error("Image too large");
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks);
  }
  throw new Error("Too many redirects");
}

/**
 * Downloads, shrinks and stores a web picture. Returns its new /photos/<id>
 * address, or null if the picture couldn't be copied.
 */
export async function copyRemoteImage(url: string): Promise<string | null> {
  try {
    const original = await download(url);
    const jpeg = await sharp(original, { limitInputPixels: 50_000_000 })
      .rotate()
      .resize(MAX_EDGE, MAX_EDGE, { fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer();
    const id = randomUUID();
    await insertPhoto(id, "image/jpeg", new Uint8Array(jpeg));
    return `/photos/${id}`;
  } catch (error) {
    console.warn(`Couldn't copy recipe picture from ${url}:`, error);
    return null;
  }
}
