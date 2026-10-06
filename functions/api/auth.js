import { handle, json, requireAdmin } from "../../lib/http.js";

// POST /api/auth — checks the admin password
export const onRequestPost = handle(async ({ request, env }) => {
  requireAdmin(request, env);
  return json({ ok: true });
});
