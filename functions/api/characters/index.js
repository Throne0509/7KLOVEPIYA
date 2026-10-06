import { handle, json, requireAdmin, readBody, HttpError } from "../../../lib/http.js";
import { normalizeCharacter, rowToCharacter, isUniqueViolation, UNIQUE_NAME_MSG } from "../../../lib/characters.js";

// GET /api/characters — everyone (no image bytes; each has an img URL)
export const onRequestGet = handle(async ({ env }) => {
  const { results } = await env.DB.prepare(
    "SELECT id, kind, name, type, image_type, updated_at FROM characters ORDER BY kind, name"
  ).all();
  return json(results.map(rowToCharacter));
});

// POST /api/characters — admin
export const onRequestPost = handle(async ({ request, env }) => {
  requireAdmin(request, env);
  const c = normalizeCharacter(await readBody(request));
  const id = crypto.randomUUID(), now = Date.now();
  try {
    await env.DB.prepare("INSERT INTO characters (id, kind, name, type, image, image_type, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(id, c.kind, c.name, c.type, c.image?.bytes ?? null, c.image?.type ?? null, now).run();
  } catch (e) {
    if (isUniqueViolation(e)) throw new HttpError(409, UNIQUE_NAME_MSG);
    throw e;
  }
  return json(rowToCharacter({ id, ...c, image_type: c.image?.type ?? null, updated_at: now }), 201);
});
