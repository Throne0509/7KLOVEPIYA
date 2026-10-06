import { handle, json, requireAdmin, readBody, HttpError } from "../../../lib/http.js";
import { normalizeCharacter, isUniqueViolation, UNIQUE_NAME_MSG } from "../../../lib/characters.js";

// PUT /api/characters/:id — admin. Omit `image` to keep the current one.
export const onRequestPut = handle(async ({ request, env, params }) => {
  requireAdmin(request, env);
  const c = normalizeCharacter(await readBody(request));
  const current = await env.DB.prepare("SELECT kind FROM characters WHERE id = ?").bind(params.id).first();
  if (!current) throw new HttpError(404, "ไม่พบตัวละครนี้ อาจถูกลบไปแล้ว");
  if (current.kind !== c.kind) throw new HttpError(400, "เปลี่ยนชนิดระหว่างฮีโร่กับสัตว์เลี้ยงไม่ได้");
  const stmt = c.image
    ? env.DB.prepare("UPDATE characters SET name = ?, type = ?, image = ?, image_type = ?, updated_at = ? WHERE id = ?")
        .bind(c.name, c.type, c.image.bytes, c.image.type, Date.now(), params.id)
    : env.DB.prepare("UPDATE characters SET name = ?, type = ?, updated_at = ? WHERE id = ?")
        .bind(c.name, c.type, Date.now(), params.id);
  try { await stmt.run(); }
  catch (e) {
    if (isUniqueViolation(e)) throw new HttpError(409, UNIQUE_NAME_MSG);
    throw e;
  }
  return json({ ok: true });
});

// DELETE /api/characters/:id — admin. Refused while any team uses the character.
export const onRequestDelete = handle(async ({ request, env, params }) => {
  requireAdmin(request, env);
  const used = await env.DB.prepare("SELECT COUNT(*) AS n FROM teams WHERE instr(data, ?) > 0")
    .bind(`"${params.id}"`).first();
  if (used.n > 0) throw new HttpError(409, `ตัวละครนี้ถูกใช้อยู่ใน ${used.n} ทีม เอาออกจากทีมเหล่านั้นก่อนจึงจะลบได้`);
  const { meta } = await env.DB.prepare("DELETE FROM characters WHERE id = ?").bind(params.id).run();
  if (meta.changes === 0) throw new HttpError(404, "ไม่พบตัวละครนี้ อาจถูกลบไปแล้ว");
  return json({ ok: true });
});
