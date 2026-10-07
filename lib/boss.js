// Boss guide rules. A boss has a name, an optional note and image, and two rooms:
// room 1 is fought by team 1, room 2 by team 2. A room is null until its team is filled in.
import { bad, text } from "./http.js";
import { lineup, placed, charRef } from "./team.js";

// Must match BOSS_* in public/index.html
export const BOSS_ROOMS = 2;
export const BOSS_MAX_HEROES = 5;
export const MAX_RINGS = 2;
export const MAX_LOOP = 40;

function heroRow(d, label, kinds, speedMax) {
  if (!d || typeof d !== "object") bad(`${label}: ข้อมูลไม่ถูกต้อง`);
  if (d.speed !== null && (!Number.isInteger(d.speed) || d.speed < 1 || d.speed > speedMax))
    bad(`${label}: ลำดับ speed ต้องเป็นเลข 1–${speedMax}`);
  if (!Array.isArray(d.rings) || d.rings.length > MAX_RINGS) bad(`${label}: ใส่แหวนได้ไม่เกิน ${MAX_RINGS} วง`);
  return {
    speed: d.speed,
    stats: text(d.stats, 300, `${label} สเตต`),
    love: text(d.love, 100, `${label} ของรัก`),
    rings: d.rings.map((id) => charRef(id, kinds, "ring", `${label} แหวน`)),
  };
}

// loop: ordered skill casts [{hero, s: "top"|"bottom"}]; the same skill may appear many times.
function loop(v, members, label) {
  if (!Array.isArray(v) || v.length > MAX_LOOP) bad(`${label}: ลูปสกิลยาวได้ไม่เกิน ${MAX_LOOP} ครั้ง`);
  return v.map((k) => {
    if (!members.includes(k?.hero) || (k.s !== "top" && k.s !== "bottom")) bad(`${label}: ลูปสกิลมีสกิลของฮีโร่ที่ไม่ได้อยู่ในทีม`);
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
    petNote: text(t.petNote, 200, `${label} หมายเหตุสัตว์เลี้ยง`),
    loop: loop(t.loop, members, label),
    note: text(t.note, 500, `${label} คำแนะนำ`),
  };
}

// body: {name, note, rooms: [team|null, team|null]}
export function normalizeBoss(body, kinds) {
  const name = text(body?.name, 60, "ชื่อบอส");
  if (!name) bad("กรุณาใส่ชื่อบอส");
  if (!Array.isArray(body.rooms) || body.rooms.length !== BOSS_ROOMS) bad("ข้อมูลห้องไม่ถูกต้อง");
  return {
    name,
    note: text(body.note, 1000, "คำแนะนำบอส"),
    rooms: body.rooms.map((t, i) => (t === null ? null : team(t, i, kinds))),
  };
}

export const rowToBoss = (r) => ({
  id: r.id, ...JSON.parse(r.data),
  img: r.image_type ? `/api/bosses/${r.id}/image?v=${r.updated_at}` : null,
  createdAt: r.created_at, updatedAt: r.updated_at,
});
