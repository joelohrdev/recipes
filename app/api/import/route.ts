import { randomUUID } from "node:crypto";
import { insertWebImport } from "@/lib/db";

// The browser bookmarklet posts the current page here as a form submission.
// Nothing expensive happens yet: the page is stored, then the browser is sent to
// /import/<id>, which checks the passcode before asking Claude to read it.

const MAX_TEXT = 120_000;
const MAX_STRUCTURED = 60_000;

function field(form: FormData, name: string, max: number) {
  const value = form.get(name);
  return typeof value === "string" ? value.slice(0, max) : "";
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return new Response("Expected a form submission", { status: 400 });
  }

  const url = field(form, "url", 2000);
  const pageText = field(form, "text", MAX_TEXT);
  if (!/^https?:\/\//.test(url) || !pageText.trim()) {
    return new Response("Missing page URL or text", { status: 400 });
  }

  const imageUrl = field(form, "image", 2000);

  const id = randomUUID();
  await insertWebImport({
    id,
    url,
    title: field(form, "title", 500),
    pageText,
    structured: field(form, "structured", MAX_STRUCTURED),
    imageUrl: /^https:\/\//.test(imageUrl) ? imageUrl : "",
  });

  return Response.redirect(new URL(`/import/${id}`, request.url), 303);
}
