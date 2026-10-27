// ¿De qué sitio viene este perfil de médico? (`specialist.origin`)
//
// Los perfiles que se crean desde el sitio de tiendas de doctores llevan
// `origin = 'tiendas'`: usan la misma tabla `specialist` pero NO son parte del
// directorio, así que no deben aparecer ni contar en el admin (Bandeja,
// Doctores, contadores, Dashboard…) ni se aprueban o publican desde aquí.
// Un `origin` vacío (todos los perfiles de antes de esa columna) cuenta como
// del directorio, y también un perfil que no se encontró (`undefined`), para
// no esconder por error documentos o consultorios cuyo médico no se cargó.
//
// Sin dependencias del navegador ni de Supabase: se puede probar en Node.

export const ORIGIN_DIRECTORIO = "directorio";
export const ORIGIN_TIENDAS = "tiendas";

export function esDelDirectorio(s) {
  return (s?.origin ?? ORIGIN_DIRECTORIO) !== ORIGIN_TIENDAS;
}
