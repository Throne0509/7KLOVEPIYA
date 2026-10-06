// Shared helpers for the API: auth, validation, JSON responses.
// normalizeTeam is the single shape check, used on every write and every read.

export const TEAM_TYPES = ["ถึก", "เวทย์", "กายภาพ", "อื่นๆ"];

// "หน้า F หลัง B" → slots per row
export const FORMATIONS = {
  "หน้า 1 หลัง 4": { F: 1, B: 4 },
  "หน้า 2 หลัง 3": { F: 2, B: 3 },
  "หน้า 3 หลัง 2": { F: 3, B: 2 },
  "หน้า 4 หลัง 1": { F: 4, B: 1 },
};

export const STAT_KEYS = [
  "atk", "def", "hp", "spd", "crit", "critDmg", "weak", "block",
  "hit", "res", "dtr", "amp", "crush", "resil", "rejuv",
];

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

const bad = (msg) => { throw new HttpError(400, msg); };

function text(v, max, label) {
  if (typeof v !== "string" || v.length > max) bad(`${label}: ข้อความไม่ถูกต้องหรือยาวเกิน ${max} ตัวอักษร`);
  return v.trim();
}

function textList(v, maxItems, label) {
  if (!Array.isArray(v) || v.length > maxItems) bad(`${label}: ใส่ได้ไม่เกิน ${maxItems} รายการ`);
  return v.map((s) => text(s, 40, label)).filter(Boolean);
}

function names(v, label) {
  if (!Array.isArray(v) || v.some((n) => typeof n !== "string" || !n.trim() || n.length > 40))
    bad(`${label}: รายชื่อตัวละครไม่ถูกต้อง`);
  if (v.length > 4) bad(`${label}: แต่ละแถวใส่ได้ไม่เกิน 4 ตัว`);
  return v.map((n) => n.trim());
}

function formation(f, label) {
  if (!f || typeof f !== "object") bad(`${label}: ข้อมูลไม่ถูกต้อง`);
  const back = names(f.back, label), front = names(f.front, label);
  const all = [...back, ...front];
  if (all.length === 0) bad(`${label}: ต้องมีตัวละครอย่างน้อย 1 ตัว`);
  if (all.length > 5) bad(`${label}: รวมทั้งทีมไม่เกิน 5 ตัว`);
  if (new Set(all).size !== all.length) bad(`${label}: มีชื่อตัวละครซ้ำ`);
  return { back, front, pet: text(f.pet, 40, `${label} สัตว์เลี้ยง`) };
}

function stats(v, label) {
  if (!v || typeof v !== "object" || Array.isArray(v)) bad(`${label}: สเตตัสไม่ถูกต้อง`);
  const out = {};
  for (const [k, n] of Object.entries(v)) {
    if (!STAT_KEYS.includes(k)) bad(`${label}: ไม่รู้จักสเตตัส ${k}`);
    if (typeof n !== "number" || !Number.isFinite(n) || n < 0 || n > 10_000_000) bad(`${label}: ค่าสเตตัสต้องเป็นตัวเลข 0 ขึ้นไป`);
    out[k] = n;
  }
  return out;
}

function heroDetail(d, label) {
  if (!d || typeof d !== "object") bad(`${label}: ข้อมูลไม่ถูกต้อง`);
  const order = d.order ?? [];
  if (!Array.isArray(order) || order.length > 5 || order.some((n) => !Number.isInteger(n) || n < 1 || n > 20))
    bad(`${label}: ลำดับสกิลต้องเป็นเลข 1–20 ไม่เกิน 5 ตัว`);
  return {
    order,
    rings: textList(d.rings ?? [], 3, `${label} แหวน`),
    sets: textList(d.sets ?? [], 3, `${label} เซ็ตไอเทม`),
    stats: stats(d.stats ?? {}, label),
    detail: text(d.detail ?? "", 1000, `${label} รายละเอียด`),
  };
}

function counter(c, i) {
  const label = `ทีมสู้ ${i + 1}`;
  const base = formation(c, label);
  const form = c.formation ?? "";
  if (form !== "") {
    const slots = FORMATIONS[form];
    if (!slots) bad(`${label}: ฟอร์เมชันไม่ถูกต้อง`);
    if (base.front.length > slots.F || base.back.length > slots.B)
      bad(`${label}: ${form} วางแถวหน้าได้ ${slots.F} ตัว แถวหลัง ${slots.B} ตัว`);
  }
  const heroesIn = c.heroes ?? {};
  if (typeof heroesIn !== "object" || Array.isArray(heroesIn)) bad(`${label}: ข้อมูลตัวละครไม่ถูกต้อง`);
  const members = [...base.back, ...base.front];
  const heroes = {};
  for (const [name, d] of Object.entries(heroesIn)) {
    if (!members.includes(name)) bad(`${label}: ${name} ไม่ได้อยู่ในทีม`);
    heroes[name] = heroDetail(d, `${label} · ${name}`);
  }
  return {
    ...base,
    formation: form,
    subPet: text(c.subPet ?? "", 40, `${label} สัตว์เลี้ยงรอง`),
    note: text(c.note ?? "", 500, `${label} คำแนะนำ`),
    heroes,
  };
}

export function normalizeTeam(body) {
  if (!TEAM_TYPES.includes(body?.type)) bad("ประเภททีมไม่ถูกต้อง");
  if (!Array.isArray(body.counters) || body.counters.length > 30) bad("ทีมสู้ไม่เกิน 30 ทีม");
  return { type: body.type, ...formation(body, "ทีมที่ต้องการตี"), counters: body.counters.map(counter) };
}

export async function readBody(request) {
  try { return await request.json(); }
  catch { throw new HttpError(400, "ข้อมูลที่ส่งมาไม่ใช่ JSON"); }
}

export const rowToTeam = (r) => ({ id: r.id, ...normalizeTeam(JSON.parse(r.data)), createdAt: r.created_at, updatedAt: r.updated_at });
