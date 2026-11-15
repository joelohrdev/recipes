import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";

// Anyone can read recipes; adding, editing and deleting needs the passcode.
// Unlocking sets a signed cookie: "<expiry>.<hmac(expiry)>".

const COOKIE = "recipe_unlock";
const MAX_AGE_DAYS = 90;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error("Set SESSION_SECRET (at least 16 characters) in .env.local");
  }
  return s;
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function passcodeMatches(attempt: string) {
  const passcode = process.env.RECIPE_PASSCODE;
  if (!passcode) throw new Error("Set RECIPE_PASSCODE in .env.local");
  // Compare HMACs so the comparison is constant-time regardless of length.
  return safeEqual(sign(`pass:${attempt}`), sign(`pass:${passcode}`));
}

export async function unlock() {
  const expires = Date.now() + MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  const value = `${expires}.${sign(String(expires))}`;
  (await cookies()).set(COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_DAYS * 24 * 60 * 60,
  });
}

export async function lock() {
  (await cookies()).delete(COOKIE);
}

export async function isUnlocked() {
  await connection(); // the expiry check depends on the current time
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value) return false;
  const [expires, signature] = value.split(".");
  if (!expires || !signature) return false;
  if (!safeEqual(signature, sign(expires))) return false;
  return Number(expires) > Date.now();
}

/** Use at the top of every protected page and Server Action. */
export async function requireUnlocked(returnTo: string) {
  if (!(await isUnlocked())) {
    redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  }
}
