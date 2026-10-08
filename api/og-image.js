import sharp from "sharp";
import { SUPABASE_URL, loadPublicSpecialist, validSlug } from "./_lib/og.js";

// Imagen 1200×630 para la vista previa al compartir (la foto del doctor, ligera). Las
// fotos que suben los doctores pueden pesar varios MB (una real pesaba 2 MB) y WhatsApp
// no muestra imágenes pesadas, por eso se reduce aquí. La foto va completa y centrada
// (no recortada, para no cortar la cara) sobre una versión difuminada de ella misma.
// Sin foto, o si algo falla, sale el logo de BuscoUnDoctor. Solo lee fotos de nuestro
// propio Storage público. CLAUDE.md §8p.
const W = 1200;
const H = 630;
const PUBLIC_PREFIX = `${SUPABASE_URL}/storage/v1/object/public/`;
const LOGO_URL = `${PUBLIC_PREFIX}site-assets/email-logo.png`;
const MAX_BYTES = 12 * 1024 * 1024;

async function download(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!r.ok) throw new Error(`descarga ${r.status}`);
  const len = Number(r.headers.get("content-length") || 0);
  if (len > MAX_BYTES) throw new Error("archivo muy grande");
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length > MAX_BYTES) throw new Error("archivo muy grande");
  return buf;
}

const toJpeg = (img) => img.jpeg({ quality: 82, mozjpeg: true }).toBuffer();

async function photoCard(buf) {
  const bg = await sharp(buf).rotate().resize(W, H, { fit: "cover" }).blur(40).modulate({ brightness: 0.7 }).toBuffer();
  const fg = await sharp(buf).rotate().resize({ width: W, height: H, fit: "inside", withoutEnlargement: false }).toBuffer();
  return toJpeg(sharp(bg).composite([{ input: fg, gravity: "center" }]));
}

async function logoCard() {
  const logo = await sharp(await download(LOGO_URL)).resize({ width: 900 }).toBuffer();
  return toJpeg(
    sharp({ create: { width: W, height: H, channels: 3, background: "#ffffff" } }).composite([{ input: logo, gravity: "center" }])
  );
}

export default async function handler(req, res) {
  const slug = String(req.query.slug || "").toLowerCase();
  let out = null;
  let cache = "public, s-maxage=86400, stale-while-revalidate=604800";
  try {
    if (validSlug(slug)) {
      const s = await loadPublicSpecialist(slug);
      const photo = s?.profile_photo;
      if (photo && photo.startsWith(PUBLIC_PREFIX)) {
        out = await photoCard(await download(photo));
        if (req.query.v) cache = "public, max-age=31536000, s-maxage=31536000, immutable";
      }
    }
  } catch { out = null; }
  if (!out) {
    try { out = await logoCard(); } catch { /* sin imagen */ }
  }
  if (!out) { res.status(502).send("No se pudo generar la imagen"); return; }
  res.setHeader("Content-Type", "image/jpeg");
  res.setHeader("Cache-Control", cache);
  res.status(200).send(out);
}
