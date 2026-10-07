// Team rules. A lineup is a formation, a fixed number of slots per row, and heroes placed in them
// (up to 3 for guild war teams, up to 5 for boss teams).
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

const KIND_LABEL = { hero: "ฮีโร่", pet: "สัตว์เลี้ยง", ring: "แหวน" };

// kinds: Map<characterId, "hero"|"pet"|"ring">
export function charRef(id, kinds, kind, label) {
  if (kinds.get(id) !== kind) bad(`${label}: ไม่พบ${KIND_LABEL[kind]}นี้ในคลัง`);
  return id;
}

function row(v, size, kinds, label) {
  if (!Array.isArray(v) || v.length !== size) bad(`${label}: จำนวนช่องไม่ตรงกับฟอร์เมชัน`);
  return v.map((id) => (id === null ? null : charRef(id, kinds, "hero", label)));
}

// Returns {formation, back, front, pet} with back/front as slot arrays (id or null).
export function lineup(t, kinds, label, max = MAX_HEROES) {
  const slots = FORMATIONS[t?.formation];
  if (!slots) bad(`${label}: กรุณาเลือกฟอร์เมชัน`);
  const back = row(t.back, slots.B, kinds, `${label} แถวหลัง`);
  const front = row(t.front, slots.F, kinds, `${label} แถวหน้า`);
  const heroes = [...back, ...front].filter(Boolean);
  if (heroes.length === 0) bad(`${label}: ต้องมีฮีโร่อย่างน้อย 1 ตัว`);
  if (heroes.length > max) bad(`${label}: ใส่ฮีโร่ได้ไม่เกิน ${max} ตัว`);
  if (new Set(heroes).size !== heroes.length) bad(`${label}: มีฮีโร่ซ้ำ`);
  if (!t.pet) bad(`${label}: กรุณาเลือกสัตว์เลี้ยง`);
  return { formation: t.formation, back, front, pet: charRef(t.pet, kinds, "pet", label) };
}

export const placed = (l) => [...l.back, ...l.front].filter(Boolean);

export function textList(v, maxItems, label) {
  if (!Array.isArray(v) || v.length > maxItems) bad(`${label}: ใส่ได้ไม่เกิน ${maxItems} รายการ`);
  return v.map((s) => text(s, 40, label)).filter(Boolean);
}

export function stats(v, label) {
  if (!v || typeof v !== "object" || Array.isArray(v)) bad(`${label}: สเตตัสไม่ถูกต้อง`);
  const out = {};
  for (const [k, n] of Object.entries(v)) {
    if (!STAT_KEYS.includes(k)) bad(`${label}: ไม่รู้จักสเตตัส ${k}`);
    if (typeof n !== "number" || !Number.isFinite(n) || n < 0 || n > 10_000_000) bad(`${label}: ค่าสเตตัสต้องเป็นตัวเลข 0 ขึ้นไป`);
    out[k] = n;
  }
  return out;
}

export const MAX_SKILLS = 3;
export const MAX_RINGS = 2;

function heroDetail(d, kinds, label) {
  if (!d || typeof d !== "object") bad(`${label}: ข้อมูลไม่ถูกต้อง`);
  if (!Array.isArray(d.rings) || d.rings.length > MAX_RINGS) bad(`${label}: ใส่แหวนได้ไม่เกิน ${MAX_RINGS} วง`);
  return {
    rings: d.rings.map((id) => { if (kinds.get(id) !== "ring") bad(`${label}: ไม่พบแหวนนี้ในคลัง`); return id; }),
    sets: textList(d.sets, 3, `${label} เซ็ตไอเทม`),
    stats: stats(d.stats, label),
    detail: text(d.detail, 1000, `${label} รายละเอียด`),
  };
}

// skills: ordered list of reserved skills, [{hero: id, s: "top"|"bottom"}]; position in the list is the cast order.
function skills(v, members, label) {
  if (!Array.isArray(v) || v.length > MAX_SKILLS) bad(`${label}: จองสกิลได้ไม่เกิน ${MAX_SKILLS} สกิล`);
  const seen = new Set();
  return v.map((k) => {
    if (!members.includes(k?.hero) || (k.s !== "top" && k.s !== "bottom")) bad(`${label}: ลำดับสกิลไม่ถูกต้อง`);
    const key = k.hero + k.s;
    if (seen.has(key)) bad(`${label}: จองสกิลเดียวกันซ้ำ`);
    seen.add(key);
    return { hero: k.hero, s: k.s };
  });
}

function counter(c, i, kinds) {
  const label = `ทีมสู้ ${i + 1}`;
  const l = lineup(c, kinds, label);
  if (c.subPet !== "") charRef(c.subPet, kinds, "pet", `${label} สัตว์เลี้ยงรอง`);
  if (!c.heroes || typeof c.heroes !== "object" || Array.isArray(c.heroes)) bad(`${label}: ข้อมูลฮีโร่ไม่ถูกต้อง`);
  const members = placed(l), heroes = {};
  for (const [id, d] of Object.entries(c.heroes)) {
    if (!members.includes(id)) bad(`${label}: มีรายละเอียดของฮีโร่ที่ไม่ได้อยู่ในทีม`);
    heroes[id] = heroDetail(d, kinds, label);
  }
  return { ...l, subPet: c.subPet, skills: skills(c.skills, members, label), note: text(c.note, 500, `${label} คำแนะนำ`), heroes };
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

// Reading never enforces rules. It only reshapes counters saved by the previous version:
// typed skill numbers (no top/bottom) become an empty skill list, and typed ring names are dropped
// because rings are now picked from the library.
export function rowToTeam(r, kinds) {
  const d = JSON.parse(r.data);
  const counters = d.counters.map((c) => ({
    ...c,
    skills: c.skills ?? [],
    heroes: Object.fromEntries(Object.entries(c.heroes).map(([id, h]) => [id, {
      rings: h.rings.filter((x) => kinds.get(x) === "ring"),
      sets: h.sets, stats: h.stats, detail: h.detail,
    }])),
  }));
  return { id: r.id, ...d, counters, createdAt: r.created_at, updatedAt: r.updated_at };
}
