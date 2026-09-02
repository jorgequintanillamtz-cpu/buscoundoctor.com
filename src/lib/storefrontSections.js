/**
 * Definición y resolución del orden de las secciones del storefront.
 * Compartido entre la vista pública (StorefrontView) y el editor del doctor
 * (SectionOrderEditor) para que ambos respeten el mismo orden.
 *
 * El hero (foto + nombre + botón de agendar cita) NO es reordenable: siempre
 * va primero. Estas son las secciones que sí se pueden reordenar.
 */

export const SECTION_IDS = [
  "conditions",
  "insurances",
  "location",
  "timeline",
  "faq",
  "products",
];

export const SECTION_LABELS = {
  conditions: "Qué atiende",
  insurances: "Seguros",
  location: "Ubicación",
  timeline: "Trayectoria",
  faq: "Preguntas frecuentes",
  products: "Productos",
};

export const DEFAULT_SECTION_ORDER = [
  "conditions",
  "insurances",
  "location",
  "timeline",
  "faq",
  "products",
];

// Anchor (id del DOM) de cada sección para la navegación in-page.
// "products" no se agrega al menú lateral, pero conserva su anchor por si se
// enlaza directamente.
export const SECTION_ANCHORS = {
  conditions: "detalle",
  insurances: "seguros",
  location: "ubicacion",
  timeline: "trayectoria",
  faq: "preguntas",
  products: "productos",
};

/**
 * Normaliza un orden guardado: conserva los ids conocidos en su orden, y
 * agrega al final cualquier id conocido que falte (defensivo frente a
 * storefronts viejos o ids nuevos).
 */
export function normalizeOrder(order) {
  if (!Array.isArray(order) || order.length === 0) {
    return [...DEFAULT_SECTION_ORDER];
  }
  const seen = new Set();
  const out = [];
  for (const id of order) {
    if (SECTION_IDS.includes(id) && !seen.has(id)) {
      out.push(id);
      seen.add(id);
    }
  }
  SECTION_IDS.forEach((id) => {
    if (!seen.has(id)) {
      out.push(id);
      seen.add(id);
    }
  });
  return out;
}

/**
 * Devuelve la lista ordenada de secciones que SÍ tienen contenido, como
 * { id, label, anchor }. Las secciones sin contenido se omiten (no dejan
 * huecos ni rompen el orden del resto).
 */
export function resolveSections(order, data) {
  const seq = normalizeOrder(order);
  const hasContent = {
    conditions: (data.conditions || []).length > 0,
    insurances: (data.insurances || []).length > 0,
    location: (data.locations || []).length > 0,
    timeline: (data.timeline || []).length > 0,
    faq: (data.faqs || []).length > 0,
    products: (data.products || []).length > 0,
  };
  return seq
    .filter((id) => hasContent[id])
    .map((id) => ({ id, label: SECTION_LABELS[id], anchor: SECTION_ANCHORS[id] }));
}