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

// DELETE /api/characters/:id — admin. Refused while any guild war team or boss uses the character.
export const onRequestDelete = handle(async ({ request, env, params }) => {
  requireAdmin(request, env);
  const ref = `"${params.id}"`;
  const used = await env.DB.prepare(
    "SELECT (SELECT COUNT(*) FROM teams WHERE instr(data, ?1) > 0) AS teams, (SELECT COUNT(*) FROM bosses WHERE instr(data, ?1) > 0) AS bosses"
  ).bind(ref).first();
  if (used.teams + used.bosses > 0) {
    const where = [used.teams && `ทีมกิลวอร์ ${used.teams} ทีม`, used.bosses && `บอส/ปราสาท ${used.bosses} รายการ`].filter(Boolean).join(" และ ");
    throw new HttpError(409, `ตัวละครนี้ถูกใช้อยู่ใน${where} เอาออกก่อนจึงจะลบได้`);
  }
  const [del] = await env.DB.batch([
    env.DB.prepare("DELETE FROM characters WHERE id = ?").bind(params.id),
    env.DB.prepare("DELETE FROM hero_skills WHERE hero_id = ?").bind(params.id),
  ]);
  if (del.meta.changes === 0) throw new HttpError(404, "ไม่พบตัวละครนี้ อาจถูกลบไปแล้ว");
  return json({ ok: true });
});
