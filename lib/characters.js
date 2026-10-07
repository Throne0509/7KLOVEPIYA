// Library rules: heroes, pets, rings and item sets, each with an optional image stored in D1.
import { bad, text } from "./http.js";

// Must match HERO_TYPES in public/index.html
export const HERO_TYPES = ["กายภาพ", "เวทย์", "ถึก", "สนับสนุน", "สมดุล"];
const IMAGE_TYPES = ["image/webp", "image/png", "image/jpeg"];
const MAX_IMAGE_BYTES = 300 * 1024;

export const KINDS = ["hero", "pet", "ring", "set"];

// body: {kind, name, type, image?: {type, data(base64)}}
export function normalizeCharacter(body) {
  if (!KINDS.includes(body?.kind)) bad("ชนิดต้องเป็นฮีโร่ สัตว์เลี้ยง แหวน หรือเซ็ตไอเทม");
  const name = text(body.name, 40, "ชื่อ");
  if (!name) bad("กรุณาใส่ชื่อ");
  const type = body.kind === "hero" ? body.type : "";
  if (body.kind === "hero" && !HERO_TYPES.includes(type)) bad("กรุณาเลือกประเภทฮีโร่");
  return { kind: body.kind, name, type, image: body.image === undefined ? undefined : decodeImage(body.image) };
}

export function decodeImage(img) {
  if (!img || !IMAGE_TYPES.includes(img.type) || typeof img.data !== "string") bad("รูปต้องเป็น WebP, PNG หรือ JPEG");
  let bin;
  try { bin = atob(img.data); } catch { bad("ข้อมูลรูปเสียหาย"); }
  if (bin.length > MAX_IMAGE_BYTES) bad("รูปใหญ่เกิน 300 KB");
  return { type: img.type, bytes: Uint8Array.from(bin, (c) => c.charCodeAt(0)) };
}

// Skill icons per hero. Guild war skill boxes use top/bottom only; boss loops use all three.
export const SKILL_SLOTS = ["top", "bottom", "awake"];

// skills: Map<heroId, Map<slot, updated_at>> from hero_skills
export const rowToCharacter = (r, skills = new Map()) => ({
  id: r.id, kind: r.kind, name: r.name, type: r.type,
  img: r.image_type ? `/api/characters/${r.id}/image?v=${r.updated_at}` : null,
  ...(r.kind === "hero" ? { skills: Object.fromEntries(SKILL_SLOTS.map((s) => {
    const v = skills.get(r.id)?.get(s);
    return [s, v ? `/api/characters/${r.id}/skills/${s}?v=${v}` : null];
  })) } : {}),
});

// For team validation: id → "hero" | "pet" | "ring" | "set"
export async function characterKinds(db) {
  const { results } = await db.prepare("SELECT id, kind FROM characters").all();
  return new Map(results.map((r) => [r.id, r.kind]));
}

// For reading saved teams: kinds by id, plus item set ids by name (older teams stored typed set names).
export async function libraryIndex(db) {
  const { results } = await db.prepare("SELECT id, kind, name FROM characters").all();
  return {
    kinds: new Map(results.map((r) => [r.id, r.kind])),
    setByName: new Map(results.filter((r) => r.kind === "set").map((r) => [r.name, r.id])),
  };
}

// Item sets as stored: ids now; typed names in teams saved before sets had a library. A name becomes the
// id of the library set with exactly that name, and is left out while no such set exists.
export const MAX_SETS = 2;
export const setsFromRow = (sets, { kinds, setByName }) =>
  sets.map((x) => (kinds.get(x) === "set" ? x : setByName.get(x))).filter(Boolean).slice(0, MAX_SETS);

export const UNIQUE_NAME_MSG = "มีชื่อนี้ในคลังแล้ว";
export const isUniqueViolation = (e) => /UNIQUE constraint failed/.test(String(e?.message));
