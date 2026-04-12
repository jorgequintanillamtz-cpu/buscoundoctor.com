import { Link } from "react-router-dom";
import { MapPin, Clock, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SpecialistCard({ specialist }) {
  return (
    <Link
      to={`/especialista/${specialist.slug}`}
      className="group block bg-card rounded-2xl border border-border/50 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 overflow-hidden"
    >
      <div className="p-5 sm:p-6">
        <div className="flex gap-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-accent flex-shrink-0 flex items-center justify-center overflow-hidden">
            {specialist.profile_photo ? (
              <img src={specialist.profile_photo} alt={specialist.full_name} className="w-full h-full object-cover" />
            ) : (
              <span className="font-heading font-bold text-xl text-primary">
                {specialist.full_name?.split(" ").map(n => n[0]).join("").slice(0, 2)}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-heading font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
              {specialist.full_name}
            </h3>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5">
              <span className="text-xs font-medium text-primary bg-accent px-2 py-0.5 rounded-full">
                {specialist.specialty}
              </span>
              {specialist.subspecialty && (
                <span className="text-xs text-muted-foreground">
                  · {specialist.subspecialty}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {specialist.zone || specialist.location}
              </span>
              {specialist.years_experience && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {specialist.years_experience} años exp.
                </span>
              )}
            </div>

          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {specialist.modality && (
              <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full capitalize">
                {specialist.modality}
              </span>
            )}
            {specialist.price_range && (
              <span className="text-xs text-muted-foreground">
                {specialist.price_range === "$" ? "$800 - $900" : specialist.price_range === "$$" ? "$900 - $1,200" : specialist.price_range === "$$$" ? "$1,200 - $1,600" : "$1,600 - $2,000"}
              </span>
            )}
          </div>
          <Button size="sm" variant="ghost" className="text-primary text-xs gap-1 group-hover:bg-accent">
            Ver perfil <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </Link>
  );
}