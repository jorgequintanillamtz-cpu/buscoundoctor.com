import { base44 } from "@/api/base44Client";

// Datos extra de las tarjetas del listado de especialistas (SpecialistCard.jsx): opiniones aprobadas
// (cuántas y promedio real), consultorio principal y precio de la consulta. Se piden con UNA sola
// llamada a la función de la base de datos `get_card_extras` por página, no una por tarjeta: cada
// tarjeta pide su id y, al terminar el mismo "tick", se manda el lote entero. Lo ya pedido se guarda
// en memoria mientras la pestaña esté abierta. CLAUDE.md §8q.
const cache = new Map(); // id -> datos | null (null = esa fila no regresó nada)
let pending = [];
let timer = null;

async function flush() {
  const batch = pending;
  pending = [];
  timer = null;
  const ids = [...new Set(batch.map((b) => b.id))];
  let rows = null;
  try {
    const { data } = await base44.functions.invoke("getCardExtras", { ids });
    rows = data || [];
  } catch { /* sin datos extra: la tarjeta se ve con lo que ya trae */ }
  if (rows) {
    const byId = new Map(rows.map((r) => [r.specialist_id, r]));
    ids.forEach((id) => cache.set(id, byId.get(id) || null));
  }
  batch.forEach((b) => b.resolve(cache.get(b.id) ?? null));
}

export function loadCardExtras(id) {
  if (cache.has(id)) return Promise.resolve(cache.get(id));
  return new Promise((resolve) => {
    pending.push({ id, resolve });
    if (!timer) timer = setTimeout(flush, 15);
  });
}

// Catálogo de aseguradoras (id -> nombre), una sola vez.
let insurerMapPromise = null;
export function loadInsurerMap() {
  if (!insurerMapPromise) {
    insurerMapPromise = base44.entities.Insurer.list("name", 300)
      .then((list) => new Map(list.map((i) => [i.id, i.name])))
      .catch(() => { insurerMapPromise = null; return new Map(); });
  }
  return insurerMapPromise;
}
