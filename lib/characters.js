// Library rules: heroes, pets and rings, each with an optional image stored in D1.
import { bad, text } from "./http.js";

// Must match HERO_TYPES in public/index.html
export const HERO_TYPES = ["กายภาพ", "เวทย์", "ถึก", "สนับสนุน", "สมดุล"];
const IMAGE_TYPES = ["image/webp", "image/png", "image/jpeg"];
const MAX_IMAGE_BYTES = 300 * 1024;

export const KINDS = ["hero", "pet", "ring"];

// body: {kind, name, type, image?: {type, data(base64)}}
export function normalizeCharacter(body) {
  if (!KINDS.includes(body?.kind)) bad("ชนิดต้องเป็นฮีโร่ สัตว์เลี้ยง หรือแหวน");
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

export const SKILL_SLOTS = ["top", "bottom"];

// skills: Map<heroId, Map<slot, updated_at>> from hero_skills
export const rowToCharacter = (r, skills = new Map()) => ({
  id: r.id, kind: r.kind, name: r.name, type: r.type,
  img: r.image_type ? `/api/characters/${r.id}/image?v=${r.updated_at}` : null,
  ...(r.kind === "hero" ? { skills: Object.fromEntries(SKILL_SLOTS.map((s) => {
    const v = skills.get(r.id)?.get(s);
    return [s, v ? `/api/characters/${r.id}/skills/${s}?v=${v}` : null];
  })) } : {}),
});

// For team validation: id → "hero" | "pet" | "ring"
export async function characterKinds(db) {
  const { results } = await db.prepare("SELECT id, kind FROM characters").all();
  return new Map(results.map((r) => [r.id, r.kind]));
}

export const UNIQUE_NAME_MSG = "มีชื่อนี้ในคลังแล้ว";
export const isUniqueViolation = (e) => /UNIQUE constraint failed/.test(String(e?.message));
