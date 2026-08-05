// Orden de aparición de los especialistas en los listados públicos
// (directorio, página de especialidad, especialidad+zona).
//
// Prioridad: 1) destacados manualmente por el admin (featured), luego
// 2) perfil más completo (completeness_score), y por último 3) quien se
// registró primero (created_date más antigua). Esto es justo lo que le
// prometemos a los médicos en /para-medicos: regístrate temprano y termina
// tu perfil para salir más arriba.
export function rankSpecialists(list) {
  return [...list].sort((a, b) => {
    const featuredDiff = (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
    if (featuredDiff !== 0) return featuredDiff;

    const scoreDiff = (b.completeness_score || 0) - (a.completeness_score || 0);
    if (scoreDiff !== 0) return scoreDiff;

    return (a.created_date || "").localeCompare(b.created_date || "");
  });
}
