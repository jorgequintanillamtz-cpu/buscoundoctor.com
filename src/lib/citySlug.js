// Resuelve el segmento de ciudad de las URLs públicas
// /:professionSlug/:citySlug[/:zonaSlug]. Antes "monterrey" estaba fijo en
// cada archivo que armaba uno de estos enlaces; ahora se calcula a partir
// del campo `city` que ya existe en la entidad Zone, así que agregar una
// zona en una ciudad nueva desde /admin/zonas basta para que las páginas de
// esa ciudad empiecen a generarse solas — no hay que tocar código de nuevo.

export function slugify(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// Dado el catálogo de zonas activas y (opcionalmente) el nombre de una zona
// ya elegida por el usuario, devuelve el citySlug a usar en la URL.
//
// Si hay zona elegida, la ciudad sale de esa zona (correcto incluso con
// varias ciudades). Si no hay zona elegida — búsqueda general por
// especialidad, sin filtrar por zona — no hay forma de saber a qué ciudad
// pertenece el usuario, así que se cae a la ciudad de la primera zona
// activa. Hoy eso siempre resuelve a Monterrey porque es la única ciudad
// que existe. El día que se agregue una segunda ciudad, ese caso "sin zona
// elegida" va a necesitar un selector de ciudad real en el sitio — este
// helper no lo resuelve, solo evita que el string quede fijo en el código.
export function resolveCitySlug(zones, zoneName) {
  const match = zoneName ? zones.find((z) => z.name === zoneName) : null;
  const city = match?.city || zones[0]?.city || "Monterrey";
  return slugify(city);
}
