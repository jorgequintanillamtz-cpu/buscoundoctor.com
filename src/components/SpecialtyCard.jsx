import { Link } from "react-router-dom";
import { Brain, Smile, Heart, Baby, Stethoscope, Sparkles } from "lucide-react";

const iconMap = {
  Brain, Smile, Heart, Baby, Stethoscope, Sparkles,
};

export default function SpecialtyCard({ specialty, mobile = false }) {
  const Icon = iconMap[specialty.icon] || Heart;

  if (mobile) {
    return (
      <Link
        to={`/especialistas?specialty=${encodeURIComponent(specialty.name)}`}
        className="group flex-shrink-0 flex flex-col items-center gap-2"
      >
        <div className="w-14 h-14 rounded-full bg-brand-bluePale flex items-center justify-center group-hover:bg-brand-blue transition-colors duration-300">
          <Icon className="w-6 h-6 text-brand-blue group-hover:text-white transition-colors duration-300" />
        </div>
        <span className="text-xs font-heading font-medium text-brand-navy text-center leading-tight w-16 line-clamp-2">{specialty.name}</span>
      </Link>
    );
  }

  return (
    <Link
      to={`/especialistas?specialty=${encodeURIComponent(specialty.name)}`}
      className="group flex flex-col items-center gap-2 p-3 rounded-2xl bg-white border border-border/50 shadow-sm hover:shadow-lg hover:border-brand-blue/30 transition-all duration-300"
    >
      <div className="w-11 h-11 rounded-full bg-brand-bluePale flex items-center justify-center group-hover:bg-brand-blue transition-colors duration-300">
        <Icon className="w-5 h-5 text-brand-blue group-hover:text-white transition-colors duration-300" />
      </div>
      <div className="text-center">
        <h3 className="font-heading font-semibold text-xs text-brand-navy leading-tight">{specialty.name}</h3>
      </div>
    </Link>
  );
}