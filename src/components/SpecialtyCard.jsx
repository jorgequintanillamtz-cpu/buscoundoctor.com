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
      className="group flex flex-col items-center gap-3 p-5 rounded-2xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
    >
      <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center group-hover:bg-primary/10 transition-colors duration-300">
        <Icon className="w-6 h-6 text-primary" />
      </div>
      <div className="text-center">
        <h3 className="font-heading font-semibold text-sm text-foreground">{specialty.name}</h3>
      </div>
    </Link>
  );
}