import { findPhoto } from "@/lib/db";

// Serves dish photos uploaded from the iPad. Each upload gets a new id, so the
// response never changes and browsers can cache it forever.
export async function GET(_request: Request, ctx: RouteContext<"/photos/[id]">) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response("Not found", { status: 404 });
  const photo = await findPhoto(id);
  if (!photo) return new Response("Not found", { status: 404 });
  return new Response(photo.data, {
    headers: {
      "Content-Type": photo.mime,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
