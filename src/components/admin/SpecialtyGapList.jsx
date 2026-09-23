// Lista de "estas especialidades todavía no tienen ni una" (subespecialidad,
// enfermedad...), con un chip por especialidad que abre directo el formulario
// de crear, con esa especialidad ya elegida. Antes Subespecialidades y
// Enfermedades tenían cada una su propia versión de "huecos por
// especialidad" y ya se habían desalineado: Subespecialidades sí mostraba
// esta lista útil, pero Enfermedades solo dejaba la tabla vacía sin decir
// cuáles especialidades faltaban. Con este componente las dos se comportan
// igual (y mejor: Enfermedades ahora también dice cuáles faltan).
export default function SpecialtyGapList({ specialties, emptyMessage = "Todas las especialidades tienen al menos una. 🎉", onPick }) {
  if (specialties.length === 0) {
    return (
      <div className="bg-card border border-border/50 rounded-2xl p-5">
        <p className="text-sm text-muted-foreground text-center py-8">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border/50 rounded-2xl p-5">
      <p className="text-sm font-semibold text-foreground mb-3">Especialidades sin ninguna todavía</p>
      <div className="flex flex-wrap gap-2">
        {specialties.map((s) => (
          <button
            key={s.id || s.name}
            type="button"
            onClick={() => onPick(s)}
            className="text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-full transition-colors"
          >
            {s.name}
          </button>
        ))}
      </div>
    </div>
  );
}
