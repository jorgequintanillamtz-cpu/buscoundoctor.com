import { Link } from "react-router-dom";
import { Brain, Smile, Heart, Baby, Stethoscope, Sparkles, Bone, Eye, Ear, Droplet, Activity, Scissors, Pill, Wind, Dumbbell, Syringe, Microscope, Users, Utensils } from "lucide-react";

const iconMap = {
  Brain, Smile, Heart, Baby, Stethoscope, Sparkles, Bone, Eye, Ear, Droplet, Activity, Scissors, Pill, Wind, Dumbbell, Syringe, Microscope, Users, Utensils,
};

// Paleta de colores pastel para los círculos de ícono, uno por especialidad.
// Se elige de forma determinística (hash del slug/nombre) para que cada
// especialidad siempre tenga el mismo color sin importar el orden en que
// aparezca.
const PALETTE = [
  { bg: "#FEE2E2", fg: "#E11D48" }, // rojo/rosa
  { bg: "#EDE9FE", fg: "#7C3AED" }, // violeta
  { bg: "#DBEAFE", fg: "#2563EB" }, // azul
  { bg: "#F3E8FF", fg: "#9333EA" }, // púrpura
  { bg: "#CCFBF1", fg: "#0D9488" }, // verde azulado
  { bg: "#FFEDD5", fg: "#EA580C" }, // naranja
  { bg: "#FCE7F3", fg: "#DB2777" }, // rosa
  { bg: "#CFFAFE", fg: "#0891B2" }, // cian
  { bg: "#FEF3C7", fg: "#D97706" }, // ámbar
  { bg: "#D1FAE5", fg: "#059669" }, // esmeralda
  { bg: "#E0E7FF", fg: "#4F46E5" }, // índigo
  { bg: "#ECFCCB", fg: "#65A30D" }, // lima
];

function colorFor(key) {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

export default function SpecialtyCard({ specialty, mobile = false }) {
  const Icon = iconMap[specialty.icon] || Heart;
  const color = colorFor(specialty.slug || specialty.name || "");

  if (mobile) {
    return (
      <Link
        to={`/especialistas?specialty=${encodeURIComponent(specialty.name)}`}
        className="group flex-shrink-0 w-28 flex flex-col items-center gap-2.5 p-4 rounded-2xl bg-white border border-border/50 shadow-sm hover:shadow-lg hover:border-brand-blue/30 transition-all duration-300"
      >
        <div className="w-14 h-14 rounded-full bg-brand-bluePale flex items-center justify-center group-hover:bg-brand-blue transition-colors duration-300 flex-shrink-0">
          <Icon className="w-6 h-6 text-brand-blue group-hover:text-white transition-colors duration-300" />
        </div>
        <span className="text-xs font-heading font-semibold text-brand-navy text-center leading-snug">{specialty.name}</span>
      </Link>
    );
  }

  return (
    <Link
      to={`/especialistas?specialty=${encodeURIComponent(specialty.name)}`}
      className="group flex flex-col items-center gap-3 w-20 sm:w-24"
    >
      <div
        className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full flex items-center justify-center transition-transform duration-300 group-hover:-translate-y-1 group-hover:shadow-lg"
        style={{ backgroundColor: color.bg }}
      >
        <Icon className="w-7 h-7 sm:w-8 sm:h-8" style={{ color: color.fg }} />
      </div>
      <span className="text-xs sm:text-sm font-medium text-foreground text-center leading-tight">{specialty.name}</span>
    </Link>
  );
}