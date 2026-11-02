import { useId } from "react";

// Sello de recomendaciones (dibujo propio en SVG, estilo sello, dorado): borde en zigzag, dos aros cafés,
// "RECOMENDADO" curvo arriba y abajo, un punto a cada lado y el número al centro. Un destello suave lo cruza
// cada pocos segundos y al pasar el ratón (index.css: medal, medal-shine). Ids únicos por sello (useId).
const SEAL = "50.0,1.0 56.2,6.9 63.8,3.0 68.1,10.4 76.5,8.8 78.5,17.1 87.0,17.9 86.6,26.5 94.6,29.6 91.7,37.7 98.5,43.0 93.5,50.0 98.5,57.0 91.7,62.3 94.6,70.4 86.6,73.5 87.0,82.1 78.5,82.9 76.5,91.2 68.1,89.6 63.8,97.0 56.2,93.1 50.0,99.0 43.8,93.1 36.2,97.0 31.9,89.6 23.5,91.2 21.5,82.9 13.0,82.1 13.4,73.5 5.4,70.4 8.3,62.3 1.5,57.0 6.5,50.0 1.5,43.0 8.3,37.7 5.4,29.6 13.4,26.5 13.0,17.9 21.5,17.1 23.5,8.8 31.9,10.4 36.2,3.0 43.8,6.9";

export default function RecommendationMedal({ count, className = "", size = "w-[41px] h-[41px]" }) {
  const id = useId().replace(/:/g, "");
  const label = `Recomendado por ${count} ${count === 1 ? "paciente" : "pacientes"}`;
  const digits = String(count).length;
  const numSize = digits >= 3 ? 20 : digits === 2 ? 25 : 30;
  return (
    <span className={`medal ${size} drop-shadow-[0_2px_4px_rgba(180,120,0,0.45)] ${className}`} title={label}>
      <svg viewBox="0 0 100 100" className="w-full h-full" aria-hidden="true">
        <defs>
          <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" className="[stop-color:theme(colors.yellow.200)]" />
            <stop offset="35%" className="[stop-color:theme(colors.amber.400)]" />
            <stop offset="60%" className="[stop-color:theme(colors.yellow.400)]" />
            <stop offset="100%" className="[stop-color:theme(colors.amber.600)]" />
          </linearGradient>
          <path id={`${id}-top`} d="M 22,50 A 28,28 0 0 1 78,50" />
          <path id={`${id}-bottom`} d="M 15,50 A 35,35 0 0 0 85,50" />
          <clipPath id={`${id}-clip`}><polygon points={SEAL} /></clipPath>
        </defs>
        <polygon points={SEAL} fill={`url(#${id}-gold)`} />
        <g fill="none" className="stroke-amber-900">
          <circle cx="50" cy="50" r="39" strokeWidth="2" />
          <circle cx="50" cy="50" r="21" strokeWidth="1.75" />
        </g>
        <g className="fill-amber-900 font-heading" fontWeight="800" fontSize="9.5" letterSpacing="0.6">
          <text><textPath href={`#${id}-top`} startOffset="50%" textAnchor="middle">RECOMENDADO</textPath></text>
          <text><textPath href={`#${id}-bottom`} startOffset="50%" textAnchor="middle">RECOMENDADO</textPath></text>
          <circle cx="15.5" cy="50" r="2.2" />
          <circle cx="84.5" cy="50" r="2.2" />
          <text x="50" y="51" textAnchor="middle" dominantBaseline="central" fontSize={numSize} letterSpacing="0">{count}</text>
        </g>
        {/* Destello suave: una franja blanca que cruza el sello (recortada a su forma). */}
        <g clipPath={`url(#${id}-clip)`}>
          <rect className="medal-shine fill-white/40" x="-30" y="-10" width="18" height="120" />
        </g>
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}
