// Shared helpers for the API: auth, validation, JSON responses.

export const TEAM_TYPES = ["ถึก", "เวทย์", "กายภาพ", "อื่นๆ"];

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

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

function names(v, label) {
  if (!Array.isArray(v) || v.some((n) => typeof n !== "string" || !n.trim() || n.length > 40))
    throw new HttpError(400, `${label}: รายชื่อตัวละครไม่ถูกต้อง`);
  if (v.length > 3) throw new HttpError(400, `${label}: แต่ละแถวใส่ได้ไม่เกิน 3 ตัว`);
  return v.map((n) => n.trim());
}

function formation(f, label) {
  if (!f || typeof f !== "object") throw new HttpError(400, `${label}: ข้อมูลไม่ถูกต้อง`);
  const back = names(f.back, label), front = names(f.front, label);
  const n = back.length + front.length;
  if (n === 0) throw new HttpError(400, `${label}: ต้องมีตัวละครอย่างน้อย 1 ตัว`);
  if (n > 5) throw new HttpError(400, `${label}: รวมทั้งทีมไม่เกิน 5 ตัว`);
  if (typeof f.pet !== "string" || f.pet.length > 40) throw new HttpError(400, `${label}: ชื่อสัตว์เลี้ยงไม่ถูกต้อง`);
  return { back, front, pet: f.pet.trim() };
}

export function validateTeam(body) {
  if (!TEAM_TYPES.includes(body?.type)) throw new HttpError(400, "ประเภททีมไม่ถูกต้อง");
  if (!Array.isArray(body.counters) || body.counters.length === 0) throw new HttpError(400, "ต้องมีทีมแก้อย่างน้อย 1 ทีม");
  if (body.counters.length > 20) throw new HttpError(400, "ทีมแก้ไม่เกิน 20 ทีม");
  return {
    type: body.type,
    ...formation(body, "ทีมที่ต้องการตี"),
    counters: body.counters.map((c, i) => {
      if (typeof c.note !== "string" || c.note.length > 500) throw new HttpError(400, `ทีมแก้ ${i + 1}: หมายเหตุยาวเกินไป`);
      return { ...formation(c, `ทีมแก้ ${i + 1}`), note: c.note.trim() };
    }),
  };
}

export async function readBody(request) {
  try { return await request.json(); }
  catch { throw new HttpError(400, "ข้อมูลที่ส่งมาไม่ใช่ JSON"); }
}

export const rowToTeam = (r) => ({ id: r.id, ...JSON.parse(r.data), createdAt: r.created_at, updatedAt: r.updated_at });
