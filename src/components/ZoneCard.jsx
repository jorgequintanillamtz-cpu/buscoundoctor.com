import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";

export default function ZoneCard({ zone }) {
  return (
    <Link
      to={`/especialistas?zone=${encodeURIComponent(zone.name)}`}
      className="group flex flex-col items-center gap-2 p-3 rounded-2xl bg-secondary border border-border/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
    >
      <div className="w-10 h-10 rounded-xl bg-white/60 flex items-center justify-center group-hover:bg-primary/10 transition-colors duration-300">
        <MapPin className="w-5 h-5 text-primary" />
      </div>
      <div className="text-center">
        <h3 className="font-heading font-semibold text-xs text-foreground leading-tight">{zone.name}</h3>
        {zone.city && <p className="text-[10px] text-muted-foreground">{zone.city}</p>}
      </div>
    </Link>
  );
}