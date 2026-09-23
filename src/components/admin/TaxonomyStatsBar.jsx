import { AlertTriangle } from "lucide-react";

// Las 3 tarjetas de arriba de cada banco: total, un segundo número propio de
// cada pantalla (activas / especialidades cubiertas), y la de "huecos" que
// además funciona como botón para filtrar. El significado del segundo y
// tercer número cambia por pantalla; el layout y el comportamiento de
// "clic para filtrar" son idénticos, así que solo eso se comparte.
export default function TaxonomyStatsBar({ total, totalLabel, secondary, secondaryLabel, gapCount, gapLabel, gapActive, onToggleGap }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
      <div className="bg-card border border-border/50 rounded-2xl p-4">
        <p className="text-2xl font-heading font-bold text-foreground">{total}</p>
        <p className="text-xs text-muted-foreground">{totalLabel}</p>
      </div>
      <div className="bg-card border border-border/50 rounded-2xl p-4">
        <p className="text-2xl font-heading font-bold text-foreground">{secondary}</p>
        <p className="text-xs text-muted-foreground">{secondaryLabel}</p>
      </div>
      <button
        type="button"
        onClick={onToggleGap}
        className={`text-left bg-card border rounded-2xl p-4 transition-colors col-span-2 sm:col-span-1 ${gapActive ? "border-amber-400 ring-1 ring-amber-400" : "border-border/50 hover:border-amber-300"}`}
      >
        <p className="text-2xl font-heading font-bold text-amber-600 flex items-center gap-1.5">
          <AlertTriangle className="w-5 h-5" /> {gapCount}
        </p>
        <p className="text-xs text-muted-foreground">{gapLabel}</p>
      </button>
    </div>
  );
}
