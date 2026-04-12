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
        className="flex-shrink-0 flex flex-col items-center gap-2"
      >
        <div className="w-14 h-14 rounded-full bg-secondary border border-border/50 flex items-center justify-center hover:bg-primary/10 transition-colors duration-300">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <span className="text-xs font-medium text-foreground text-center leading-tight w-16 line-clamp-2">{specialty.name}</span>
      </Link>
    );
  }

  return (
    <Link
      to={`/especialistas?specialty=${encodeURIComponent(specialty.name)}`}
      className="group flex flex-col items-center gap-2 p-3 rounded-2xl bg-secondary border border-border/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
    >
      <div className="w-10 h-10 rounded-xl bg-white/60 flex items-center justify-center group-hover:bg-primary/10 transition-colors duration-300">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div className="text-center">
        <h3 className="font-heading font-semibold text-xs text-foreground leading-tight">{specialty.name}</h3>
      </div>
    </Link>
  );
}