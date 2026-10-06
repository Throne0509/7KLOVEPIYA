// GET /api/characters/:id/image — everyone. URL carries ?v=updated_at, so it can be cached forever.
export async function onRequestGet({ env, params }) {
  const row = await env.DB.prepare("SELECT image, image_type FROM characters WHERE id = ?").bind(params.id).first();
  if (!row || !row.image_type) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(row.image), {
    headers: { "content-type": row.image_type, "cache-control": "public, max-age=31536000, immutable" },
  });
}
