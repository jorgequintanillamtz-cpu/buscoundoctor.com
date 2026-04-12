import { Link } from "react-router-dom";
import { Brain, Smile, Heart, Baby, Stethoscope, Sparkles } from "lucide-react";

const iconMap = {
  Brain, Smile, Heart, Baby, Stethoscope, Sparkles,
};

export default function SpecialtyCard({ specialty }) {
  const Icon = iconMap[specialty.icon] || Heart;

  return (
    <Link
      to={`/especialistas?specialty=${encodeURIComponent(specialty.name)}`}
      className="group flex flex-col items-center gap-2 flex-shrink-0"
    >
      <div className="w-16 h-16 rounded-full bg-secondary border border-border/50 flex items-center justify-center group-hover:bg-primary/10 group-hover:border-primary/30 transition-all duration-300">
        <Icon className="w-6 h-6 text-primary" />
      </div>
      <span className="font-heading font-medium text-xs text-foreground text-center leading-tight max-w-[72px]">{specialty.name}</span>
    </Link>
  );
}