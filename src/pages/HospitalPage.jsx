import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { MapPin, Phone, Globe, ExternalLink, Stethoscope, UserPlus, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import SpecialistCard from "@/components/SpecialistCard";
import LoadingLogo from "@/components/LoadingLogo";
import { rankSpecialists } from "@/lib/specialistRanking";
import { setCanonical, setOpenGraph, buildAbsoluteUrl } from "@/lib/seoMeta";
import { hospitalEmbedUrl, hospitalMapsLink, hospitalTelHref, specialistsAtHospital } from "@/lib/hospitals";

function setMeta(name, content) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) { el = document.createElement("meta"); el.setAttribute("name", name); document.head.appendChild(el); }
  el.setAttribute("content", content);
}

// /hospital/:slug -- los médicos verificados que atienden en un hospital del
// catálogo. Solo se indexa en Google cuando tiene al menos un médico (misma
// regla que las páginas de especialidad), para no acumular páginas vacías.
export default function HospitalPage() {
  const { slug } = useParams();
  const [hospital, setHospital] = useState(null);
  const [zoneName, setZoneName] = useState("");
  const [doctors, setDoctors] = useState([]);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [specialtyFilter, setSpecialtyFilter] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setNotFound(false);
    setSpecialtyFilter("");
    (async () => {
      const [found, zones] = await Promise.all([
        base44.entities.Hospital.filter({ slug, active: true }).catch(() => []),
        base44.entities.Zone.filter({ active: true }).catch(() => []),
      ]);
      if (!active) return;
      const h = found[0];
      if (!h) { setNotFound(true); setLoading(false); return; }
      const [offices, specialists] = await Promise.all([
        base44.entities.Office.filter({ hospital_id: h.id }).catch(() => []),
        base44.entities.Specialist.filter({ active: true, publication_status: "published" }).catch(() => []),
      ]);
      if (!active) return;
      setHospital(h);
      setZoneName(zones.find((z) => z.id === h.zone_id)?.name || "");
      setDoctors(specialistsAtHospital(h.id, offices, specialists));
      setLoading(false);
    })();
    return () => { active = false; };
  }, [slug]);

  const hasDoctors = doctors.length > 0;

  // Especialidades presentes (para los filtros) con su conteo.
  const specialtyChips = useMemo(() => {
    const counts = {};
    doctors.forEach((d) => { if (d.specialty) counts[d.specialty] = (counts[d.specialty] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"));
  }, [doctors]);

  const visible = useMemo(() => {
    const list = specialtyFilter ? doctors.filter((d) => d.specialty === specialtyFilter) : doctors;
    return rankSpecialists(list);
  }, [doctors, specialtyFilter]);

  // SEO: título, descripción, canonical, redes y robots (index solo con médicos).
  useEffect(() => {
    if (notFound) { setMeta("robots", "noindex, follow"); return; }
    if (!hospital) return;
    const where = zoneName ? `${hospital.name}, ${zoneName}` : hospital.name;
    const title = `Médicos en ${where} | BuscoUnDoctor`;
    const description = `Encuentra médicos con cédula profesional verificada que atienden en ${where}. Consulta perfiles y reseñas y contacta directo por WhatsApp.`;
    document.title = title;
    setMeta("description", description);
    setMeta("robots", hasDoctors ? "index, follow" : "noindex, follow");
    setCanonical(`/hospital/${hospital.slug}`);
    setOpenGraph({ title, description, url: buildAbsoluteUrl(`/hospital/${hospital.slug}`) });
  }, [hospital, zoneName, hasDoctors, notFound]);

  // Datos estructurados: el hospital y la ruta de navegación.
  useEffect(() => {
    if (!hospital) return;
    const ld = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Hospital",
          "name": hospital.name,
          "description": hospital.description || undefined,
          "telephone": hospital.phone || undefined,
          "sameAs": hospital.website ? [hospital.website] : undefined,
          "address": {
            "@type": "PostalAddress",
            "streetAddress": [hospital.address_street, hospital.address_ext_number].filter(Boolean).join(" ") || hospital.address_line || undefined,
            "addressLocality": zoneName || "Monterrey",
            "addressRegion": "Nuevo León",
            "addressCountry": "MX",
            "postalCode": hospital.address_postal_code || undefined,
          },
          "geo": hospital.latitude != null && hospital.longitude != null
            ? { "@type": "GeoCoordinates", "latitude": Number(hospital.latitude), "longitude": Number(hospital.longitude) }
            : undefined,
        },
        {
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Inicio", "item": buildAbsoluteUrl("/") },
            { "@type": "ListItem", "position": 2, "name": "Hospitales", "item": buildAbsoluteUrl("/hospitales") },
            { "@type": "ListItem", "position": 3, "name": hospital.name, "item": buildAbsoluteUrl(`/hospital/${hospital.slug}`) },
          ],
        },
      ],
    };
    const el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = "hospital-jsonld";
    el.text = JSON.stringify(ld);
    document.head.appendChild(el);
    return () => { el.remove(); };
  }, [hospital, zoneName]);

  // Pantalla completa mientras carga: evita que el pie de página se asome y brinque.
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[100dvh]">
        <LoadingLogo />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20 px-4">
        <h1 className="font-heading font-bold text-2xl text-foreground">Hospital no encontrado</h1>
        <p className="text-sm text-muted-foreground mt-2">Este hospital no está en nuestro catálogo.</p>
        <Button variant="outline" className="mt-5 rounded-xl" asChild>
          <Link to="/hospitales">Ver todos los hospitales</Link>
        </Button>
      </div>
    );
  }

  const telHref = hospitalTelHref(hospital.phone);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <Breadcrumb className="mb-5">
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink asChild><Link to="/">Inicio</Link></BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbLink asChild><Link to="/hospitales">Hospitales</Link></BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem><BreadcrumbPage>{hospital.name}</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-start gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-brand-bluePale flex items-center justify-center flex-shrink-0">
          <Building2 className="w-6 h-6 text-brand-blue" />
        </div>
        <div className="min-w-0">
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-foreground leading-tight">
            Médicos en {hospital.name}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {zoneName ? `${zoneName} · ` : ""}Médicos con cédula profesional verificada
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* Médicos */}
        <div className="min-w-0">
          {hasDoctors ? (
            <>
              {specialtyChips.length > 1 && (
                <div className="flex flex-wrap gap-2 mb-4" role="group" aria-label="Filtrar por especialidad">
                  <button
                    type="button"
                    onClick={() => setSpecialtyFilter("")}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${!specialtyFilter ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border/60 text-muted-foreground hover:text-foreground"}`}
                  >
                    Todas ({doctors.length})
                  </button>
                  {specialtyChips.map(([name, count]) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setSpecialtyFilter(name)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${specialtyFilter === name ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border/60 text-muted-foreground hover:text-foreground"}`}
                    >
                      {name} ({count})
                    </button>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-1 gap-4">
                {visible.map((s, i) => <SpecialistCard key={s.id} specialist={s} priority={i === 0} sourcePage="hospital" />)}
              </div>
            </>
          ) : (
            <div className="bg-card border border-border/50 rounded-2xl p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-11 h-11 rounded-full bg-brand-bluePale flex items-center justify-center flex-shrink-0">
                  <Stethoscope className="w-5 h-5 text-brand-blue" />
                </div>
                <div>
                  <h2 className="font-heading font-semibold text-base text-foreground">Aún no hay médicos aquí</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Estamos incorporando médicos verificados que atienden en {hospital.name}. Mientras tanto puedes explorar el directorio completo.
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button className="rounded-xl" asChild><Link to="/especialistas">Ver especialistas</Link></Button>
              </div>
              <div className="pt-5 mt-5 border-t border-border/50 flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
                <UserPlus className="w-5 h-5 text-brand-blue flex-shrink-0 hidden sm:block" />
                <p className="text-xs text-muted-foreground flex-1">¿Atiendes en {hospital.name}? Aparece aquí con tu perfil verificado.</p>
                <Button variant="outline" size="sm" className="rounded-xl flex-shrink-0" asChild>
                  <Link to="/registro-medico">Regístrate gratis</Link>
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Datos del hospital y mapa */}
        <aside className="min-w-0">
          <div className="bg-card border border-border/50 rounded-2xl p-5 lg:sticky lg:top-20">
            <h2 className="font-heading font-semibold text-sm text-foreground mb-3">Sobre el hospital</h2>
            {hospital.description && <p className="text-sm text-muted-foreground leading-relaxed mb-4">{hospital.description}</p>}
            <ul className="space-y-2.5 text-sm">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-foreground">{hospital.address_line}{zoneName ? `, ${zoneName}` : ""}</span>
              </li>
              {hospital.phone && (
                <li className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-primary flex-shrink-0" />
                  {telHref ? <a href={telHref} className="text-foreground hover:underline">{hospital.phone}</a> : <span>{hospital.phone}</span>}
                </li>
              )}
              {hospital.website && (
                <li className="flex items-center gap-2.5">
                  <Globe className="w-4 h-4 text-primary flex-shrink-0" />
                  <a href={hospital.website} target="_blank" rel="noopener noreferrer nofollow" className="text-brand-blue hover:underline break-all">Sitio oficial del hospital</a>
                </li>
              )}
            </ul>
            <div className="mt-4 rounded-xl overflow-hidden border border-border/50">
              <iframe
                title={`Mapa de ${hospital.name}`}
                src={hospitalEmbedUrl(hospital, zoneName)}
                width="100%"
                height="240"
                style={{ border: 0 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
            <a
              href={hospitalMapsLink(hospital, zoneName)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-blue hover:underline"
            >
              Abrir en Google Maps <ExternalLink className="w-3 h-3" />
            </a>
            <p className="text-[11px] text-muted-foreground leading-relaxed mt-4 pt-4 border-t border-border/50">
              BuscoUnDoctor es un directorio independiente y no está afiliado a {hospital.name}. Los médicos listados atienden de forma independiente; confirma siempre tu cita directamente con el consultorio.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
