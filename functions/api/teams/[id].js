import { handle, json, requireAdmin, normalizeTeam, readBody, HttpError } from "../../../lib/team.js";

// PUT /api/teams/:id — admin
export const onRequestPut = handle(async ({ request, env, params }) => {
  requireAdmin(request, env);
  const team = normalizeTeam(await readBody(request));
  const { meta } = await env.DB.prepare("UPDATE teams SET data = ?, updated_at = ? WHERE id = ?")
    .bind(JSON.stringify(team), Date.now(), params.id).run();
  if (meta.changes === 0) throw new HttpError(404, "ไม่พบทีมนี้ อาจถูกลบไปแล้ว");
  return json({ ok: true });
});

// DELETE /api/teams/:id — admin
export const onRequestDelete = handle(async ({ request, env, params }) => {
  requireAdmin(request, env);
  const { meta } = await env.DB.prepare("DELETE FROM teams WHERE id = ?").bind(params.id).run();
  if (meta.changes === 0) throw new HttpError(404, "ไม่พบทีมนี้ อาจถูกลบไปแล้ว");
  return json({ ok: true });
});
