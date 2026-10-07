import { handle, json, requireAdmin, readBody } from "../../../lib/http.js";
import { normalizeTeam, rowToTeam } from "../../../lib/team.js";
import { characterKinds, libraryIndex } from "../../../lib/characters.js";

// GET /api/teams — everyone
export const onRequestGet = handle(async ({ env }) => {
  const { results } = await env.DB.prepare("SELECT * FROM teams ORDER BY created_at DESC").all();
  const index = await libraryIndex(env.DB);
  return json(results.map((r) => rowToTeam(r, index)));
});

// POST /api/teams — admin
export const onRequestPost = handle(async ({ request, env }) => {
  requireAdmin(request, env);
  const team = normalizeTeam(await readBody(request), await characterKinds(env.DB));
  const id = crypto.randomUUID();
  const now = Date.now();
  await env.DB.prepare("INSERT INTO teams (id, data, created_at, updated_at) VALUES (?, ?, ?, ?)")
    .bind(id, JSON.stringify(team), now, now).run();
  return json({ id, ...team, createdAt: now, updatedAt: now }, 201);
});
