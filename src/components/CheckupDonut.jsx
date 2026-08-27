// Dona de resumen para la calculadora de chequeos: muestra cuántos estudios
// hay en una categoría de urgencia y se va llenando conforme el usuario marca
// estudios como ya hechos. SVG ligero, sin dependencias.

export default function CheckupDonut({ total, completed, color, label }) {
  const R = 34;
  const C = 2 * Math.PI * R;
  const pending = Math.max(total - completed, 0);
  const frac = total > 0 ? pending / total : 0;

  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
          <circle cx="40" cy="40" r={R} fill="none" strokeWidth="8" className="stroke-border/50" />
          <circle
            cx="40"
            cy="40"
            r={R}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${C * frac} ${C}`}
            style={{ transition: "stroke-dasharray 0.4s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-heading font-bold text-2xl text-foreground leading-none">{pending}</span>
          <span className="text-[10px] text-muted-foreground mt-0.5">de {total}</span>
        </div>
      </div>
      <div className="mt-2.5 flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-xs font-semibold text-foreground">{label}</span>
      </div>
      <span className="text-[11px] text-muted-foreground mt-0.5">
        {total === 0 ? "sin estudios" : pending === 0 ? "¡completo!" : completed > 0 ? `${completed} hecho${completed !== 1 ? "s" : ""}` : "por hacer"}
      </span>
    </div>
  );
}