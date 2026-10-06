// Team rules. A lineup is a formation, a fixed number of slots per row, and up to 3 heroes placed in them.
// Every hero and pet is a character id that must exist in the character library.
import { bad, text } from "./http.js";

// Must match TEAM_TYPES / FORMATIONS / STATS in public/index.html
export const TEAM_TYPES = ["ถึก", "เวทย์", "กายภาพ", "อื่นๆ"];
export const FORMATIONS = {
  "หน้า 1 หลัง 4": { F: 1, B: 4 },
  "หน้า 2 หลัง 3": { F: 2, B: 3 },
  "หน้า 3 หลัง 2": { F: 3, B: 2 },
  "หน้า 4 หลัง 1": { F: 4, B: 1 },
};
export const MAX_HEROES = 3;
export const STAT_KEYS = [
  "atk", "def", "hp", "spd", "crit", "critDmg", "weak", "block",
  "hit", "res", "dtr", "amp", "crush", "resil", "rejuv",
];

// kinds: Map<characterId, "hero"|"pet">
function charRef(id, kinds, kind, label) {
  if (kinds.get(id) !== kind) bad(`${label}: ไม่พบ${kind === "hero" ? "ฮีโร่" : "สัตว์เลี้ยง"}นี้ในคลัง`);
  return id;
}

function row(v, size, kinds, label) {
  if (!Array.isArray(v) || v.length !== size) bad(`${label}: จำนวนช่องไม่ตรงกับฟอร์เมชัน`);
  return v.map((id) => (id === null ? null : charRef(id, kinds, "hero", label)));
}

// Returns {formation, back, front, pet} with back/front as slot arrays (id or null).
function lineup(t, kinds, label) {
  const slots = FORMATIONS[t?.formation];
  if (!slots) bad(`${label}: กรุณาเลือกฟอร์เมชัน`);
  const back = row(t.back, slots.B, kinds, `${label} แถวหลัง`);
  const front = row(t.front, slots.F, kinds, `${label} แถวหน้า`);
  const heroes = [...back, ...front].filter(Boolean);
  if (heroes.length === 0) bad(`${label}: ต้องมีฮีโร่อย่างน้อย 1 ตัว`);
  if (heroes.length > MAX_HEROES) bad(`${label}: ใส่ฮีโร่ได้ไม่เกิน ${MAX_HEROES} ตัว`);
  if (new Set(heroes).size !== heroes.length) bad(`${label}: มีฮีโร่ซ้ำ`);
  if (!t.pet) bad(`${label}: กรุณาเลือกสัตว์เลี้ยง`);
  return { formation: t.formation, back, front, pet: charRef(t.pet, kinds, "pet", label) };
}

const placed = (l) => [...l.back, ...l.front].filter(Boolean);

function textList(v, maxItems, label) {
  if (!Array.isArray(v) || v.length > maxItems) bad(`${label}: ใส่ได้ไม่เกิน ${maxItems} รายการ`);
  return v.map((s) => text(s, 40, label)).filter(Boolean);
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
  if (!Array.isArray(d.order) || d.order.length > 5 || d.order.some((n) => !Number.isInteger(n) || n < 1 || n > 20))
    bad(`${label}: ลำดับสกิลต้องเป็นเลข 1–20 ไม่เกิน 5 ตัว`);
  return {
    order: d.order,
    rings: textList(d.rings, 3, `${label} แหวน`),
    sets: textList(d.sets, 3, `${label} เซ็ตไอเทม`),
    stats: stats(d.stats, label),
    detail: text(d.detail, 1000, `${label} รายละเอียด`),
  };
}

function counter(c, i, kinds) {
  const label = `ทีมสู้ ${i + 1}`;
  const l = lineup(c, kinds, label);
  if (c.subPet !== "") charRef(c.subPet, kinds, "pet", `${label} สัตว์เลี้ยงรอง`);
  if (!c.heroes || typeof c.heroes !== "object" || Array.isArray(c.heroes)) bad(`${label}: ข้อมูลฮีโร่ไม่ถูกต้อง`);
  const members = placed(l), heroes = {};
  for (const [id, d] of Object.entries(c.heroes)) {
    if (!members.includes(id)) bad(`${label}: มีรายละเอียดของฮีโร่ที่ไม่ได้อยู่ในทีม`);
    heroes[id] = heroDetail(d, label);
  }
  return { ...l, subPet: c.subPet, note: text(c.note, 500, `${label} คำแนะนำ`), heroes };
}

export function normalizeTeam(body, kinds) {
  if (!TEAM_TYPES.includes(body?.type)) bad("กรุณาเลือกประเภททีม");
  if (!Array.isArray(body.counters) || body.counters.length > 30) bad("ทีมสู้ไม่เกิน 30 ทีม");
  return {
    type: body.type,
    ...lineup(body, kinds, "ทีมเป้าหมาย"),
    counters: body.counters.map((c, i) => counter(c, i, kinds)),
  };
}

export const rowToTeam = (r) => ({ id: r.id, ...JSON.parse(r.data), createdAt: r.created_at, updatedAt: r.updated_at });
