import { handle, json, requireAdmin, readBody } from "../../../lib/http.js";
import { characterKinds, decodeImage, libraryIndex } from "../../../lib/characters.js";
import { normalizeBoss, rowToBoss } from "../../../lib/boss.js";

// GET /api/bosses — everyone (no image bytes; each has an img URL)
export const onRequestGet = handle(async ({ env }) => {
  const { results } = await env.DB.prepare(
    "SELECT id, data, image_type, created_at, updated_at FROM bosses ORDER BY created_at DESC"
  ).all();
  const index = await libraryIndex(env.DB);
  return json(results.map((r) => rowToBoss(r, index)));
});

// POST /api/bosses — admin. body: {name, note, rooms, image?}
export const onRequestPost = handle(async ({ request, env }) => {
  requireAdmin(request, env);
  const body = await readBody(request);
  const boss = normalizeBoss(body, await characterKinds(env.DB));
  const img = body.image === undefined ? null : decodeImage(body.image);
  const id = crypto.randomUUID(), now = Date.now();
  await env.DB.prepare("INSERT INTO bosses (id, data, image, image_type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(id, JSON.stringify(boss), img?.bytes ?? null, img?.type ?? null, now, now).run();
  return json(rowToBoss({ id, data: JSON.stringify(boss), image_type: img?.type ?? null, created_at: now, updated_at: now }, await libraryIndex(env.DB)), 201);
});
