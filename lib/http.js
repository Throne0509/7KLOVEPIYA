// HTTP plumbing shared by every route: errors, JSON, auth, body parsing.

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export const bad = (msg) => { throw new HttpError(400, msg); };

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export function handle(fn) {
  return async (ctx) => {
    try { return await fn(ctx); }
    catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status);
      throw e;
    }
  };
}

export function requireAdmin(request, env) {
  if (!env.ADMIN_PASSWORD) throw new Error("ADMIN_PASSWORD is not set in Cloudflare environment variables");
  const header = request.headers.get("authorization") || "";
  if (header !== "Bearer " + env.ADMIN_PASSWORD) throw new HttpError(401, "รหัสผ่านไม่ถูกต้อง");
}

export async function readBody(request) {
  try { return await request.json(); }
  catch { throw new HttpError(400, "ข้อมูลที่ส่งมาไม่ใช่ JSON"); }
}

export function text(v, max, label) {
  if (typeof v !== "string" || v.length > max) bad(`${label}: ข้อความไม่ถูกต้องหรือยาวเกิน ${max} ตัวอักษร`);
  return v.trim();
}
