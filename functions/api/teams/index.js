import { handle, json, requireAdmin, validateTeam, readBody, rowToTeam } from "../../../lib/team.js";

// GET /api/teams — everyone
export const onRequestGet = handle(async ({ env }) => {
  const { results } = await env.DB.prepare("SELECT * FROM teams ORDER BY created_at DESC").all();
  return json(results.map(rowToTeam));
});

// POST /api/teams — admin
export const onRequestPost = handle(async ({ request, env }) => {
  requireAdmin(request, env);
  const team = validateTeam(await readBody(request));
  const id = crypto.randomUUID();
  const now = Date.now();
  await env.DB.prepare("INSERT INTO teams (id, data, created_at, updated_at) VALUES (?, ?, ?, ?)")
    .bind(id, JSON.stringify(team), now, now).run();
  return json({ id, ...team, createdAt: now, updatedAt: now }, 201);
});
