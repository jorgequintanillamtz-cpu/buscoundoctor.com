// Paleta y temas para el storefront público.
// El tema se elige desde DoctorStorefront.color_theme (campo existente).
export const CREAM = "#F8F7F0"; // header y botón principal
export const INK = "#1D1D1B"; // texto sobre crema
export const WA_GREEN = "#23D366"; // botón flotante de WhatsApp

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