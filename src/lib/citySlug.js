// Resuelve el segmento de ciudad de las URLs públicas /:professionSlug/:citySlug.
// La entidad Zone representa directamente ciudades (ya no hay nivel de
// zona/colonia dentro de una ciudad), así que el slug sale del propio
// nombre de cada registro.

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

// Dado el catálogo de ciudades activas y (opcionalmente) el nombre de una ya
// elegida por el usuario, devuelve el citySlug a usar en la URL.
//
// Si hay ciudad elegida, se usa esa. Si no la hay -- búsqueda general por
// especialidad, sin filtrar por ciudad -- no hay forma de saber en qué
// ciudad está el usuario, así que se cae a la primera ciudad activa. Hoy eso
// siempre resuelve a Monterrey porque es la primera dada de alta. El día que
// haya más de una ciudad con volumen real, ese caso "sin ciudad elegida" va
// a necesitar un selector de ciudad real en el sitio (o detectarla) -- este
// helper no lo resuelve, solo evita que el string quede fijo en el código.
export function resolveCitySlug(zones, cityName) {
  const match = cityName ? zones.find((z) => z.name === cityName) : null;
  const city = match?.name || zones[0]?.name || "Monterrey";
  return slugify(city);
}
