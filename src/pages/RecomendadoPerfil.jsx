import { useState, useEffect, useCallback } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { Heart, Info, ShieldQuestion, Stethoscope, MapPin, Building2, Share2, PenLine } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import LoadingLogo from "@/components/LoadingLogo";
import LoadError from "@/components/LoadError";
import ReportRecommendationDialog from "@/components/ReportRecommendationDialog";
import RecommendedAvatar from "@/components/RecommendedAvatar";
import RecommendationCards, { ReportMenu } from "@/components/RecommendationCards";
import { recommendationTagLabel } from "@/lib/recommendationTags";
import { setCanonical, setOpenGraph, buildAbsoluteUrl } from "@/lib/seoMeta";

function setMeta(name, content) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) { el = document.createElement("meta"); el.setAttribute("name", name); document.head.appendChild(el); }
  el.setAttribute("content", content);
}

// /recomendado/:slug -- página pública de un doctor que los pacientes recomendaron y que todavía no
// reclama su perfil (CLAUDE.md §8r). A propósito NO se parece a un perfil verificado: etiqueta gris
// "Perfil sin verificar", sin sello azul, sin estrellas ni "opiniones" (solo "Recomendado por N
// pacientes" y etiquetas con conteos). Nunca muestra el mensaje privado de los pacientes. Se indexa
// en Google solo con >= 3 recomendaciones aprobadas y la cédula comprobada por el equipo; antes, solo
// se llega con el enlace.
export default function RecomendadoPerfil() {
  const { slug } = useParams();
  const [doc, setDoc] = useState(null);
  const [state, setState] = useState("loading"); // loading | ok | notfound | error
  const [report, setReport] = useState(null); // { id, kind, what } cuando se abre la ventana de reportar

  const load = useCallback(async () => {
    setState("loading");
    try {
      const { data } = await base44.functions.invoke("getRecommendedDoctor", { slug });
      if (!data?.ok) { setState("notfound"); return; }
      setDoc(data);
      setState("ok");
    } catch {
      setState("error");
    }
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (state === "notfound" || state === "error") { setMeta("robots", "noindex, nofollow"); return; }
    if (state !== "ok" || !doc || doc.redirect) return;
    const where = [doc.specialty, doc.zone].filter(Boolean).join(" en ");
    const title = `${doc.full_name}${where ? ` — ${where}` : ""} | BuscoUnDoctor`;
    const description = `${doc.count} ${doc.count === 1 ? "paciente recomienda" : "pacientes recomiendan"} a ${doc.full_name}. Perfil sin verificar: el doctor aún no ha reclamado su página en BuscoUnDoctor.`;
    document.title = title;
    setMeta("description", description);
    setMeta("robots", doc.indexable ? "index, follow" : "noindex, nofollow");
    setCanonical(`/recomendado/${doc.slug}`);
    setOpenGraph({ title, description, url: buildAbsoluteUrl(`/recomendado/${doc.slug}`) });
  }, [state, doc]);

  if (state === "loading") return <div className="min-h-[60vh] flex items-center justify-center"><LoadingLogo /></div>;
  if (state === "error") return <LoadError onRetry={load} />;
  if (state === "notfound") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <h1 className="font-heading font-bold text-xl text-foreground">No encontramos esta página</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm">Puede que el enlace esté incompleto o que la página ya no esté disponible.</p>
        <Button asChild className="mt-6 rounded-xl"><Link to="/especialistas">Buscar un especialista</Link></Button>
      </div>
    );
  }
  if (doc.redirect) return <Navigate to={doc.redirect} replace />;

  const n = doc.count;
  const url = buildAbsoluteUrl(`/recomendado/${doc.slug}`);
  const shareText = `${doc.full_name} está recomendado por ${n} ${n === 1 ? "paciente" : "pacientes"} en BuscoUnDoctor: ${url}`;

  return (
    <div className="bg-brand-canvas min-h-[70vh] py-8 sm:py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 space-y-4">
        <div className="bg-card rounded-3xl border border-brand-canvasBorder shadow-card p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <RecommendedAvatar photo={doc.photo} name={doc.full_name} className="w-16 h-16 sm:w-20 sm:h-20" />
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                <ShieldQuestion className="w-3.5 h-3.5" aria-hidden="true" /> Perfil sin verificar
              </span>
              <h1 className="font-heading font-bold text-2xl sm:text-3xl text-foreground leading-tight mt-2">{doc.full_name}</h1>
              {doc.specialty && <p className="text-muted-foreground mt-1 flex items-center gap-1.5"><Stethoscope className="w-4 h-4 flex-shrink-0" aria-hidden="true" />{doc.specialty}</p>}
            </div>
          </div>

          <div className="mt-5 space-y-2 text-sm text-foreground">
            {doc.zone && <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />{doc.zone}</p>}
            {doc.hospital && <p className="flex items-center gap-2"><Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />{doc.hospital}</p>}
            <p className="text-muted-foreground">
              {doc.license
                ? <>Cédula profesional: <span className="font-medium text-foreground">{doc.license}</span> · consultada en el Registro Nacional de Profesionistas (SEP)</>
                : doc.license_checked
                  ? "Cédula profesional consultada en el Registro Nacional de Profesionistas (SEP)"
                  : "Cédula profesional: aún sin comprobar"}
            </p>
          </div>

          <div className="mt-6 rounded-2xl bg-brand-bluePale p-5">
            <div className="flex items-start justify-between gap-3">
              <p className="flex items-center gap-2 font-heading font-bold text-lg text-brand-navy">
                <Heart className="w-5 h-5 text-red-500 fill-red-500 flex-shrink-0" aria-hidden="true" />
                {n > 0 ? `Recomendado por ${n} ${n === 1 ? "paciente" : "pacientes"}` : "Aún no hay recomendaciones publicadas"}
              </p>
              <ReportMenu items={[{ label: "Reportar recomendaciones", onSelect: () => setReport({ id: null, kind: null, what: "las recomendaciones" }) }]} />
            </div>
            {doc.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {doc.tags.map((t) => (
                  <span key={t.tag} className="text-sm bg-white text-brand-navy px-3 py-1 rounded-full border border-brand-canvasBorder">
                    {recommendationTagLabel(t.tag)} · {t.n}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-col sm:flex-row gap-2.5">
            <Button asChild className="rounded-xl min-h-[44px] gap-2 bg-brand-augusta hover:bg-brand-augusta/90 text-white">
              <Link to={`/recomendaciones?doctor=${doc.slug}`}><PenLine className="w-4 h-4" /> Recomendar a este doctor</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl min-h-[44px] gap-2">
              <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener noreferrer"><Share2 className="w-4 h-4" /> Compartir</a>
            </Button>
          </div>
        </div>

        {(doc.recommendations || []).length > 0 && (
          <div className="bg-card rounded-3xl border border-brand-canvasBorder p-5 sm:p-6">
            <h2 className="font-heading font-semibold text-foreground">Recomendaciones de pacientes ({doc.recommendations.length})</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Cada una se muestra sin apellido ni correo, después de que la revisamos. Solo mostramos recomendaciones positivas.</p>
            <div className="mt-3">
              <RecommendationCards slug={doc.slug} recommendations={doc.recommendations} />
            </div>
          </div>
        )}

        <div className="bg-card rounded-3xl border border-brand-canvasBorder p-5 sm:p-6 text-sm text-muted-foreground flex gap-3">
          <Info className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-2">
            <p>
              Esta página reúne recomendaciones de pacientes. <span className="text-foreground font-medium">{doc.full_name} aún no ha reclamado su perfil</span> ni ha sido verificado por BuscoUnDoctor: los datos de arriba los dieron los pacientes y se contrastaron con el registro público de cédulas cuando se indica.
            </p>
            <p>
              Las recomendaciones se revisan antes de publicarse. Es una opinión de pacientes, no una valoración médica ni una garantía.
            </p>
          </div>
        </div>

        <div className="bg-card rounded-3xl border border-brand-canvasBorder p-5 sm:p-6 text-sm">
          <p className="font-heading font-semibold text-foreground">¿Eres {doc.full_name}?</p>
          <p className="text-muted-foreground mt-1">
            Escríbenos para reclamar tu perfil gratis, completarlo con tu foto y datos, o para corregir o retirar esta página.
          </p>
          <Button asChild variant="outline" className="mt-3 rounded-xl min-h-[44px]"><Link to="/contacto">Contactar a BuscoUnDoctor</Link></Button>
        </div>
      </div>
      <ReportRecommendationDialog open={!!report} onOpenChange={(o) => { if (!o) setReport(null); }} slug={doc.slug} commentId={report?.id || null} kind={report?.kind || null} what={report?.what || "la recomendación"} />
    </div>
  );
}
