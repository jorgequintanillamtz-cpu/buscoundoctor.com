import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";

export default function ZoneCard({ zone }) {
  return (
    <Link
      to={`/especialistas?zone=${encodeURIComponent(zone.name)}`}
      className="group flex flex-col items-center gap-2 p-3 rounded-2xl bg-white border border-border/50 shadow-sm hover:shadow-lg hover:border-brand-blue/30 transition-all duration-300"
    >
      <div className="w-11 h-11 rounded-full bg-brand-bluePale flex items-center justify-center group-hover:bg-brand-blue transition-colors duration-300">
        <MapPin className="w-5 h-5 text-brand-blue group-hover:text-white transition-colors duration-300" />
      </div>
      <div className="text-center">
        <h3 className="font-heading font-semibold text-xs text-brand-navy leading-tight">{zone.name}</h3>
        {zone.city && <p className="text-[10px] text-muted-foreground">{zone.city}</p>}
      </div>
    </Link>
  );
}