// Boss guide rules, shared by the boss and castle tabs (`mode`). A guide has a name, an optional note
// and image, and two rooms: room 1 is fought by team 1, room 2 by team 2. A room is null until filled in.
import { bad, text } from "./http.js";
import { lineup, placed, stats, gear } from "./team.js";
import { SKILL_SLOTS, MAX_SETS, setsFromRow } from "./characters.js";

// Must match BOSS_* / MODES in public/index.html
export const MODES = ["boss", "castle"];
export const BOSS_ROOMS = 2;
export const BOSS_MAX_HEROES = 5;
export const MAX_RINGS = 2;
export const MAX_LOOP = 40;

function heroRow(d, label, kinds, speedMax) {
  if (!d || typeof d !== "object") bad(`${label}: ข้อมูลไม่ถูกต้อง`);
  if (d.speed !== null && (!Number.isInteger(d.speed) || d.speed < 1 || d.speed > speedMax))
    bad(`${label}: ลำดับ speed ต้องเป็นเลข 1–${speedMax}`);
  return {
    speed: d.speed,
    love: text(d.love, 100, `${label} ของรัก`),
    rings: gear(d.rings, MAX_RINGS, "ring", kinds, label),
    sets: gear(d.sets, MAX_SETS, "set", kinds, label),
    stats: stats(d.stats, label),
    detail: text(d.detail, 1000, `${label} รายละเอียด`),
  };
}

// loop: ordered skill casts [{hero, s: "top"|"bottom"|"awake"}]; the same skill may appear many times.
function loop(v, members, label) {
  if (!Array.isArray(v) || v.length > MAX_LOOP) bad(`${label}: ลูปสกิลยาวได้ไม่เกิน ${MAX_LOOP} ครั้ง`);
  return v.map((k) => {
    if (!members.includes(k?.hero) || !SKILL_SLOTS.includes(k.s)) bad(`${label}: ลูปสกิลมีสกิลของฮีโร่ที่ไม่ได้อยู่ในทีม`);
    return { hero: k.hero, s: k.s };
  });
}

function team(t, i, kinds) {
  const label = `ทีม ${i + 1}`;
  const l = lineup(t, kinds, label, BOSS_MAX_HEROES);
  const members = placed(l);
  if (!t.heroes || typeof t.heroes !== "object" || Array.isArray(t.heroes)) bad(`${label}: ข้อมูลฮีโร่ไม่ถูกต้อง`);
  const heroes = {};
  for (const id of members) heroes[id] = heroRow(t.heroes[id], label, kinds, members.length);
  if (Object.keys(t.heroes).some((id) => !members.includes(id))) bad(`${label}: มีข้อมูลของฮีโร่ที่ไม่ได้อยู่ในทีม`);
  const speeds = members.map((id) => heroes[id].speed).filter((n) => n !== null);
  if (new Set(speeds).size !== speeds.length) bad(`${label}: ลำดับ speed ซ้ำกัน`);
  return {
    ...l,
    heroes,
    loop: loop(t.loop, members, label),
    note: text(t.note, 500, `${label} คำแนะนำ`),
  };
}

// body: {mode, name, note, rooms: [team|null, team|null]}
export function normalizeBoss(body, kinds) {
  if (!MODES.includes(body?.mode)) bad("โหมดต้องเป็นบอสหรือปราสาท");
  const name = text(body.name, 60, "ชื่อ");
  if (!name) bad("กรุณาใส่ชื่อบอส");
  if (!Array.isArray(body.rooms) || body.rooms.length !== BOSS_ROOMS) bad("ข้อมูลห้องไม่ถูกต้อง");
  return {
    mode: body.mode,
    name,
    note: text(body.note, 1000, "คำแนะนำบอส"),
    rooms: body.rooms.map((t, i) => (t === null ? null : team(t, i, kinds))),
  };
}

// Reading never enforces rules. It only reshapes guides saved by earlier versions:
// no mode (they were all bosses), a typed stats line (kept as the hero's detail), a pet note (dropped),
// and typed set names (matched to library sets by name, see setsFromRow).
function heroFromRow(h, index) {
  if (typeof h.stats === "string") return { speed: h.speed, love: h.love, rings: h.rings, sets: [], stats: {}, detail: h.stats };
  return { ...h, sets: setsFromRow(h.sets, index) };
}
function roomFromRow(t, index) {
  if (t === null) return null;
  const { petNote, ...rest } = t;
  return { ...rest, heroes: Object.fromEntries(Object.entries(t.heroes).map(([id, h]) => [id, heroFromRow(h, index)])) };
}
export function rowToBoss(r, index) {
  const d = JSON.parse(r.data);
  return {
    id: r.id, ...d, mode: d.mode ?? "boss", rooms: d.rooms.map((t) => roomFromRow(t, index)),
    img: r.image_type ? `/api/bosses/${r.id}/image?v=${r.updated_at}` : null,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}
