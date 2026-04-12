import { Link } from "react-router-dom";
import { Brain, Smile, Heart, Baby, Stethoscope, Sparkles } from "lucide-react";

const iconMap = {
  Brain, Smile, Heart, Baby, Stethoscope, Sparkles
};

export default function SpecialtyCard({ specialty }) {
  const Icon = iconMap[specialty.icon] || Heart;

  return (
    <Link
      to={`/especialistas?specialty=${encodeURIComponent(specialty.name)}`} className="bg-[hsl(var(--accent))] p-3 rounded-2xl group flex flex-col items-center gap-2 border border-border/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">

      
      <div className="w-10 h-10 rounded-xl bg-white/60 flex items-center justify-center group-hover:bg-primary/10 transition-colors duration-300">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div className="text-center">
        <h3 className="font-heading font-semibold text-xs text-foreground leading-tight">{specialty.name}</h3>
      </div>
    </Link>);

}