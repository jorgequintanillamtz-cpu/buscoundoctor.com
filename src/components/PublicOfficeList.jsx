import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { MapPin, Clock, Star, Phone } from "lucide-react";

const DAYS = [
  { v: 0, label: "Domingo" },
  { v: 1, label: "Lunes" },
  { v: 2, label: "Martes" },
  { v: 3, label: "Miércoles" },
  { v: 4, label: "Jueves" },
  { v: 5, label: "Viernes" },
  { v: 6, label: "Sábado" },
];

function buildMapEmbedUrl(office) {
  if (office.maps_url) {
    const coordMatch = office.maps_url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (coordMatch) {
      return `https://www.google.com/maps?q=${coordMatch[1]},${coordMatch[2]}&z=16&output=embed`;
    }
  }
  const query = encodeURIComponent(`${office.address_line}, Monterrey, Nuevo León, México`);
  return `https://www.google.com/maps?q=${query}&output=embed`;
}

export default function PublicOfficeList({ specialistId }) {
  const [offices, setOffices] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [offList, zoneList] = await Promise.all([
          base44.entities.Office.filter({ specialist_id: specialistId }),
          base44.entities.Zone.list("name", 50),
        ]);
        const withHours = await Promise.all(
          offList.map(async (o) => {
            const hours = await base44.entities.OfficeHours.filter({ office_id: o.id });
            const map = {};
            hours.forEach((h) => { map[h.day_of_week] = h; });
            return {
              office: o,
              hours: DAYS.map((d) =>
                map[d.v] || { day_of_week: d.v, is_closed: true, open_time: null, close_time: null }
              ),
            };
          })
        );
        withHours.sort((a, b) => (b.office.is_primary ? 1 : 0) - (a.office.is_primary ? 1 : 0));
        setOffices(withHours);
        setZones(zoneList);
      } catch {}
      setLoading(false);
    }
    load();
  }, [specialistId]);

  if (loading) return null;
  if (!offices.length) return null;

  const zoneName = (zid) => zones.find((z) => z.id === zid)?.name || "";

  return (
    <div className="mt-6 bg-card rounded-3xl border border-border/50 p-6 sm:p-8">
      <h2 className="font-heading font-bold text-lg text-foreground mb-4">Consultorios y horarios</h2>
      <div className="space-y-5">
        {offices.map(({ office, hours }) => (
          <div key={office.id} className="border border-border/50 rounded-2xl p-4 sm:p-5">
            <div className="flex items-start gap-3 mb-3">
              <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-foreground">{office.address_line}</p>
                  {office.is_primary && (
                    <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
                      <Star className="w-3 h-3" /> Principal
                    </span>
                  )}
                </div>
                {zoneName(office.zone_id) && (
                  <p className="text-xs text-muted-foreground mt-0.5">Zona: {zoneName(office.zone_id)}</p>
                )}
                {office.phone && (
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {office.phone}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-3 rounded-xl overflow-hidden border border-border/50">
              <iframe
                title={`Mapa de ${office.address_line}`}
                src={buildMapEmbedUrl(office)}
                width="100%"
                height="220"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            {office.photos?.length > 0 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {office.photos.map((url, i) => (
                  <img key={i} src={url} alt={`Foto ${i + 1} del consultorio en ${office.address_line}`} className="w-24 h-24 rounded-xl object-cover flex-shrink-0 border border-border/50" />
                ))}
              </div>
            )}
            <div className="ml-8">
              <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Horarios
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5">
                {hours.map((h) => {
                  const dayLabel = DAYS.find((d) => d.v === h.day_of_week)?.label;
                  return (
                    <div key={h.day_of_week} className="flex items-center justify-between text-xs py-0.5">
                      <span className="text-muted-foreground">{dayLabel}</span>
                      <span className={`font-medium ${h.is_closed ? "text-red-500" : "text-foreground"}`}>
                        {h.is_closed ? "Cerrado" : `${h.open_time} – ${h.close_time}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}