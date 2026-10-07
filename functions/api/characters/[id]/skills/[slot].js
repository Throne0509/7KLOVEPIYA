import { handle, json, requireAdmin, readBody, HttpError } from "../../../../../lib/http.js";
import { decodeImage, SKILL_SLOTS } from "../../../../../lib/characters.js";

function slotOf(params) {
  if (!SKILL_SLOTS.includes(params.slot)) throw new HttpError(404, "ไม่มีช่องสกิลนี้");
  return params.slot;
}

// GET /api/characters/:id/skills/:slot — everyone. URL carries ?v=updated_at, so it can be cached forever.
export const onRequestGet = handle(async ({ env, params }) => {
  const row = await env.DB.prepare("SELECT image, image_type FROM hero_skills WHERE hero_id = ? AND slot = ?")
    .bind(params.id, slotOf(params)).first();
  if (!row) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(row.image), {
    headers: { "content-type": row.image_type, "cache-control": "public, max-age=31536000, immutable" },
  });
});

// PUT /api/characters/:id/skills/:slot — admin. body: {image: {type, data(base64)}}
export const onRequestPut = handle(async ({ request, env, params }) => {
  requireAdmin(request, env);
  const slot = slotOf(params);
  const img = decodeImage((await readBody(request)).image);
  const hero = await env.DB.prepare("SELECT kind FROM characters WHERE id = ?").bind(params.id).first();
  if (hero?.kind !== "hero") throw new HttpError(404, "ไม่พบฮีโร่นี้");
  await env.DB.prepare(
    "INSERT INTO hero_skills (hero_id, slot, image, image_type, updated_at) VALUES (?, ?, ?, ?, ?) " +
    "ON CONFLICT (hero_id, slot) DO UPDATE SET image = excluded.image, image_type = excluded.image_type, updated_at = excluded.updated_at"
  ).bind(params.id, slot, img.bytes, img.type, Date.now()).run();
  return json({ ok: true });
});

// DELETE /api/characters/:id/skills/:slot — admin
export const onRequestDelete = handle(async ({ request, env, params }) => {
  requireAdmin(request, env);
  await env.DB.prepare("DELETE FROM hero_skills WHERE hero_id = ? AND slot = ?").bind(params.id, slotOf(params)).run();
  return json({ ok: true });
});
