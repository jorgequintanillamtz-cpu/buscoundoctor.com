import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Building2, MapPin, ChevronRight } from "lucide-react";
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import LoadingLogo from "@/components/LoadingLogo";
import { setCanonical, setOpenGraph, buildAbsoluteUrl } from "@/lib/seoMeta";
import { hospitalPath, specialistsAtHospital } from "@/lib/hospitals";

function setMeta(name, content) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) { el = document.createElement("meta"); el.setAttribute("name", name); document.head.appendChild(el); }
  el.setAttribute("content", content);
}

// /hospitales -- índice de los hospitales del catálogo, con cuántos médicos
// verificados atienden en cada uno. Se indexa solo si alguno ya tiene médicos.
export default function HospitalsPage() {
  const [hospitals, setHospitals] = useState([]);
  const [zones, setZones] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const [hs, zs, offices, specialists] = await Promise.all([
        base44.entities.Hospital.filter({ active: true }).catch(() => []),
        base44.entities.Zone.filter({ active: true }).catch(() => []),
        base44.entities.Office.list("-created_date", 1000).catch(() => []),
        base44.entities.Specialist.filter({ active: true, publication_status: "published" }).catch(() => []),
      ]);
      if (!active) return;
      const c = {};
      hs.forEach((h) => { c[h.id] = specialistsAtHospital(h.id, offices, specialists).length; });
      setHospitals([...hs].sort((a, b) => (a.display_order - b.display_order) || a.name.localeCompare(b.name, "es")));
      setZones(zs);
      setCounts(c);
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  const anyDoctors = useMemo(() => Object.values(counts).some((n) => n > 0), [counts]);

  useEffect(() => {
    const title = "Hospitales en Monterrey y San Pedro Garza García | BuscoUnDoctor";
    const description = "Encuentra médicos con cédula profesional verificada según el hospital donde atienden en Monterrey y San Pedro Garza García.";
    document.title = title;
    setMeta("description", description);
    setMeta("robots", anyDoctors ? "index, follow" : "noindex, follow");
    setCanonical("/hospitales");
    setOpenGraph({ title, description, url: buildAbsoluteUrl("/hospitales") });
  }, [anyDoctors]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[100dvh]">
        <LoadingLogo />
      </div>
    );
  }

  // Agrupados por ciudad, en el orden de las zonas del catálogo.
  const groups = zones
    .map((z) => ({ zone: z, items: hospitals.filter((h) => h.zone_id === z.id) }))
    .filter((g) => g.items.length > 0);
  const ungrouped = hospitals.filter((h) => !zones.some((z) => z.id === h.zone_id));
  if (ungrouped.length) groups.push({ zone: { id: "otros", name: "Otros" }, items: ungrouped });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <Breadcrumb className="mb-5">
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink asChild><Link to="/">Inicio</Link></BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>Hospitales</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <h1 className="font-heading font-bold text-2xl sm:text-3xl text-foreground">Hospitales en Monterrey y San Pedro</h1>
      <p className="text-sm text-muted-foreground mt-1.5 mb-8 max-w-2xl">
        Elige un hospital para ver los médicos verificados que atienden ahí. BuscoUnDoctor es un directorio independiente y no está afiliado a los hospitales.
      </p>

      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">Estamos preparando el catálogo de hospitales.</p>
      ) : (
        <div className="space-y-8">
          {groups.map(({ zone, items }) => (
            <section key={zone.id}>
              <h2 className="font-heading font-semibold text-lg text-foreground mb-3">{zone.name}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {items.map((h) => (
                  <Link
                    key={h.id}
                    to={hospitalPath(h.slug)}
                    className="group bg-card border border-border/50 rounded-2xl p-4 flex items-start gap-3 hover:border-primary/40 hover:shadow-sm transition-all"
                  >
                    <div className="w-10 h-10 rounded-xl bg-brand-bluePale flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-brand-blue" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-heading font-semibold text-sm text-foreground group-hover:text-primary transition-colors">{h.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-start gap-1">
                        <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" />
                        <span className="min-w-0">{h.address_line}</span>
                      </p>
                      <p className="text-xs mt-1.5 font-medium text-brand-blue">
                        {counts[h.id] > 0 ? `${counts[h.id]} ${counts[h.id] === 1 ? "médico verificado" : "médicos verificados"}` : "Pronto más médicos"}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0" />
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
