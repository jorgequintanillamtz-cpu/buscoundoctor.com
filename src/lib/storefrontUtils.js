import { base44 } from "@/api/base44Client";
import { slugify } from "@/lib/citySlug";

/**
 * Normaliza un teléfono para wa.me:
 * - Quita todo lo que no sea dígito.
 * - Si ya trae prefijo 52 (12 dígitos), lo deja igual.
 * - Si es número nacional de 10 dígitos, le antepone 52.
 * - Si es número de EE.UU./Canadá (11 dígitos empezando con 1), lo deja igual.
 * - Cualquier otro caso se devuelve limpio de no-dígitos.
 */
export function normalizePhone(raw) {
  if (!raw) return "";
  const digits = String(raw).replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("52") && digits.length === 12) return digits;
  if (digits.startsWith("1") && digits.length === 11) return digits;
  if (digits.length === 10) return "52" + digits;
  return digits;
}

/**
 * Arma el link de WhatsApp con el mensaje codificado (encodeURIComponent).
 * Si el doctor no capturó un mensaje custom, se arma uno default con su nombre.
 */
export function buildWhatsAppLink(phone, message, doctorName) {
  const normalized = normalizePhone(phone);
  if (!normalized) return "#";
  const text =
    (message && message.trim()) ||
    `Hola, quiero agendar una cita con el/la Dr. ${doctorName || ""}`.trim();
  return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`;
}

/**
 * Genera un slug único a partir del nombre del doctor.
 * Si el slug base ya existe (en storefronts activos), se le anexa un sufijo numérico.
 */
export async function generateUniqueSlug(baseName) {
  const base = slugify(baseName);
  if (!base) return `dr-${Date.now()}`;
  const existing = await base44.entities.DoctorStorefront.filter({
    status: "active",
  }).catch(() => []);
  const slugs = new Set(existing.map((s) => s.slug));
  if (!slugs.has(base)) return base;
  let i = 2;
  while (slugs.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

export const byPosition = (a, b) => (a.position || 0) - (b.position || 0);