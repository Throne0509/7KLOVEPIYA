import { handle, json, requireAdmin, readBody, HttpError } from "../../../lib/http.js";
import { characterKinds, decodeImage } from "../../../lib/characters.js";
import { normalizeBoss } from "../../../lib/boss.js";

// PUT /api/bosses/:id — admin. Omit `image` to keep the current one.
export const onRequestPut = handle(async ({ request, env, params }) => {
  requireAdmin(request, env);
  const body = await readBody(request);
  const boss = normalizeBoss(body, await characterKinds(env.DB));
  const now = Date.now();
  const stmt = body.image === undefined
    ? env.DB.prepare("UPDATE bosses SET data = ?, updated_at = ? WHERE id = ?").bind(JSON.stringify(boss), now, params.id)
    : (() => {
        const img = decodeImage(body.image);
        return env.DB.prepare("UPDATE bosses SET data = ?, image = ?, image_type = ?, updated_at = ? WHERE id = ?")
          .bind(JSON.stringify(boss), img.bytes, img.type, now, params.id);
      })();
  const { meta } = await stmt.run();
  if (meta.changes === 0) throw new HttpError(404, "ไม่พบบอสนี้ อาจถูกลบไปแล้ว");
  return json({ ok: true });
});

// DELETE /api/bosses/:id — admin
export const onRequestDelete = handle(async ({ request, env, params }) => {
  requireAdmin(request, env);
  const { meta } = await env.DB.prepare("DELETE FROM bosses WHERE id = ?").bind(params.id).run();
  if (meta.changes === 0) throw new HttpError(404, "ไม่พบบอสนี้ อาจถูกลบไปแล้ว");
  return json({ ok: true });
});
