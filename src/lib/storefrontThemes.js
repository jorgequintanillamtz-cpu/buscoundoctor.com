// Paleta y temas para el storefront público.
// El tema clásico se elige desde DoctorStorefront.color_theme (campo
// existente). Desde el editor de estilo, el doctor puede además poner su
// propio color de fondo, color de contraste y tipografía -- ver
// resolveStorefrontStyle() más abajo, que es lo que realmente usan los
// componentes de la página pública.
export const CREAM = "#F8F7F0"; // header y botón principal (default clásico)
export const INK = "#1D1D1B"; // texto sobre crema (default clásico)
export const WA_GREEN = "#23D366"; // botón flotante de WhatsApp (fijo, no personalizable)

export const STOREFRONT_THEMES = {
  teal: {
    bg: "#2D7D72",
    deep: "#226B61",
    pill: "rgba(255,255,255,0.14)",
    card: "rgba(255,255,255,0.08)",
    border: "rgba(255,255,255,0.18)",
  },
  navy: {
    bg: "#0B1E4D",
    deep: "#081637",
    pill: "rgba(255,255,255,0.14)",
    card: "rgba(255,255,255,0.08)",
    border: "rgba(255,255,255,0.18)",
  },
  green: {
    bg: "#1F6E4C",
    deep: "#175A3C",
    pill: "rgba(255,255,255,0.14)",
    card: "rgba(255,255,255,0.08)",
    border: "rgba(255,255,255,0.18)",
  },
  plum: {
    bg: "#5B2A6B",
    deep: "#472155",
    pill: "rgba(255,255,255,0.14)",
    card: "rgba(255,255,255,0.08)",
    border: "rgba(255,255,255,0.18)",
  },
  slate: {
    bg: "#334155",
    deep: "#1E293B",
    pill: "rgba(255,255,255,0.14)",
    card: "rgba(255,255,255,0.08)",
    border: "rgba(255,255,255,0.18)",
  },
};

export function getStorefrontTheme(name) {
  return STOREFRONT_THEMES[name] || STOREFRONT_THEMES.teal;
}

// Tipografías disponibles en el editor de estilo. Todas ya están cargadas
// en index.html (Google Fonts) -- Inter/Plus Jakarta Sans/Kalam/Caveat
// venían de antes, Poppins/Lora se agregaron para este editor.
export const FONT_OPTIONS = {
  "plus-jakarta": { label: "Plus Jakarta (default)", value: "'Plus Jakarta Sans', sans-serif" },
  inter: { label: "Inter", value: "'Inter', sans-serif" },
  poppins: { label: "Poppins", value: "'Poppins', sans-serif" },
  lora: { label: "Lora (serif)", value: "'Lora', serif" },
  kalam: { label: "Kalam (manuscrita)", value: "'Kalam', cursive" },
  caveat: { label: "Caveat (manuscrita)", value: "'Caveat', cursive" },
};
const DEFAULT_FONT = FONT_OPTIONS["plus-jakarta"].value;

// Combinaciones rápidas del editor de estilo -- cada una llena los mismos
// 3 campos (bg_color/accent_color/text_color) que el doctor podría poner a
// mano, solo que de un clic. `text_color` va incluido porque los fondos
// claros (lila, blanco) necesitan letra oscura para leerse bien.
export const STYLE_PRESETS = [
  { key: "verde", label: "Verde", bg_color: "#2D7D72", accent_color: "#F8F7F0", text_color: "light" },
  { key: "navy", label: "Azul navy", bg_color: "#0B1E4D", accent_color: "#FFFFFF", text_color: "light" },
  { key: "lila", label: "Lila", bg_color: "#E1BFFD", accent_color: "#FFFFFF", text_color: "dark" },
  { key: "blanco", label: "Blanco", bg_color: "#F2F2F2", accent_color: "#5A9CE2", text_color: "dark" },
];

function clampByte(n) {
  return Math.max(0, Math.min(255, n));
}

function hexToRgb(hex) {
  const clean = (hex || "").replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const num = parseInt(full, 16);
  if (Number.isNaN(num) || full.length !== 6) return null;
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function rgbToHex({ r, g, b }) {
  const toHex = (n) => clampByte(Math.round(n)).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Oscurece un color hex un porcentaje dado (0-1), para derivar `deep` a
// partir del color de fondo que elija el doctor.
function darken(hex, amount = 0.18) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return rgbToHex({
    r: rgb.r * (1 - amount),
    g: rgb.g * (1 - amount),
    b: rgb.b * (1 - amount),
  });
}

// Negro o blanco, lo que dé más contraste sobre `hex` -- luminancia
// relativa (fórmula estándar WCAG simplificada), así cualquier color de
// contraste que elija el doctor mantiene el texto legible encima.
function contrastTextColor(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return INK;
  const toLinear = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const luminance = 0.2126 * toLinear(rgb.r) + 0.7152 * toLinear(rgb.g) + 0.0722 * toLinear(rgb.b);
  return luminance > 0.5 ? INK : "#FFFFFF";
}

// Estilo real que usa la página pública: parte del tema clásico
// (color_theme) y lo personaliza con bg_color/accent_color/font_family si
// el doctor los puso desde el editor de estilo. Storefronts que nunca
// tocaron ese editor se ven exactamente igual que antes (todo cae a los
// defaults clásicos).
// CSS compartido entre StorefrontView.jsx y StorefrontProductDetail.jsx (dos
// páginas distintas, cada una con su propio contenedor raíz .sf-root) que
// reemplaza las clases text-white/* cuando el doctor eligió letra oscura.
export const STOREFRONT_TEXT_OVERRIDE_CSS = `
  .sf-root[data-sf-text="dark"] .text-white { color: #1D1D1B; }
  .sf-root[data-sf-text="dark"] .text-white\\/90 { color: rgba(29,29,27,0.9); }
  .sf-root[data-sf-text="dark"] .text-white\\/80 { color: rgba(29,29,27,0.8); }
  .sf-root[data-sf-text="dark"] .text-white\\/70 { color: rgba(29,29,27,0.7); }
  .sf-root[data-sf-text="dark"] .text-white\\/60 { color: rgba(29,29,27,0.6); }
  .sf-root[data-sf-text="dark"] .text-white\\/50 { color: rgba(29,29,27,0.5); }
  .sf-root[data-sf-text="dark"] .text-white\\/40 { color: rgba(29,29,27,0.4); }
`;

export function resolveStorefrontStyle(storefront) {
  const preset = getStorefrontTheme(storefront?.color_theme);
  const customBg = storefront?.bg_color;
  const customAccent = storefront?.accent_color;
  const fontKey = storefront?.font_family;
  // 'light' (letra blanca, default clásico) o 'dark' (letra negra, para
  // fondos claros). Además de la letra, controla el contraste de las
  // tarjetas: overlays blancos casi no se ven sobre un fondo claro, así
  // que en modo oscuro se usan overlays negros + una sombra ligera.
  const textMode = storefront?.text_color === "dark" ? "dark" : "light";
  const isDarkText = textMode === "dark";

  return {
    bg: customBg || preset.bg,
    deep: customBg ? darken(customBg) : preset.deep,
    pill: isDarkText ? "rgba(0,0,0,0.06)" : preset.pill,
    card: isDarkText ? "rgba(0,0,0,0.035)" : preset.card,
    border: isDarkText ? "rgba(0,0,0,0.14)" : preset.border,
    cardShadow: isDarkText ? "0 1px 3px rgba(0,0,0,0.07)" : "none",
    accent: customAccent || CREAM,
    accentText: customAccent ? contrastTextColor(customAccent) : INK,
    textMode,
    fontHeading: (fontKey && FONT_OPTIONS[fontKey]?.value) || DEFAULT_FONT,
    fontBody: (fontKey && FONT_OPTIONS[fontKey]?.value) || DEFAULT_FONT,
  };
}
