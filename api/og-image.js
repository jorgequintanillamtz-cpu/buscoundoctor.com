import sharp from "sharp";
import { PUBLIC_PREFIX, loadPublicSpecialist, validSlug } from "./_lib/og.js";

// Imagen para la vista previa al compartir un perfil. Las fotos que suben los doctores
// pueden pesar varios MB (una real pesaba 2 MB) y WhatsApp no muestra imágenes pesadas,
// por eso se reduce aquí.
//  - Con foto: CUADRADA 1200×1200 que ocupa toda la tarjeta (como Doctoralia), con el logo
//    de BuscoUnDoctor en una esquina. Si la foto es vertical se recorta anclada ARRIBA (la
//    cabeza casi siempre queda arriba; el recorte automático "por atención" llegó a cortarle
//    la cabeza a una foto real); si es horizontal, centrada.
//  - Sin foto, o si algo falla: tarjeta 1200×630 con el logo sobre blanco.
// Solo lee fotos de nuestro propio Storage público. CLAUDE.md §8p.
const S = 1200;
const W = 1200;
const H = 630;
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

// El logo es una imagen con fondo transparente; se recorta el espacio vacío una sola vez.
let tightLogo = null;
async function getTightLogo() {
  if (!tightLogo) tightLogo = await sharp(await download(LOGO_URL)).trim().toBuffer();
  return tightLogo;
}

async function photoCard(buf) {
  const upright = await sharp(buf).rotate().toBuffer(); // aplica la orientación EXIF antes de medir
  const { width, height } = await sharp(upright).metadata();
  const photo = await sharp(upright)
    .resize(S, S, { fit: "cover", position: height > width ? "top" : "centre" })
    .toBuffer();

  // Logo en una "píldora" blanca semitransparente abajo a la izquierda.
  const logo = await sharp(await getTightLogo()).resize({ width: 300 }).toBuffer();
  const lm = await sharp(logo).metadata();
  const padX = 34;
  const padY = 22;
  const pw = lm.width + padX * 2;
  const ph = lm.height + padY * 2;
  const margin = 36;
  const pill = Buffer.from(
    `<svg width="${pw}" height="${ph}"><rect width="${pw}" height="${ph}" rx="${ph / 2}" fill="white" fill-opacity="0.94"/></svg>`
  );
  return toJpeg(
    sharp(photo).composite([
      { input: pill, left: margin, top: S - ph - margin },
      { input: logo, left: margin + padX, top: S - ph - margin + padY },
    ])
  );
}

async function logoCard() {
  const logo = await sharp(await getTightLogo()).resize({ width: 900 }).toBuffer();
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
