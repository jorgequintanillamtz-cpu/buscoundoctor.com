import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { BookOpen, FileText, Plus, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Franja horizontal de guías de la biblioteca (portadas estilo libro) que el
 * doctor puede agregar a su propio catálogo (DoctorProduct), según su
 * especialidad. Compartido entre DoctorProducts.jsx ("Productos digitales")
 * y DoctorStorefrontEditor.jsx ("Mi página pública") para no duplicar la
 * lógica de cargar/agregar/leer guías en los dos lugares.
 *
 * props:
 * - specialistId, specialty
 * - products: catálogo actual del doctor (para saber cuáles guías ya agregó)
 * - onAdded(newProduct): se llama al agregar una guía con éxito
 * - createOwnHref: si se pasa, siempre se muestra un link "crear tu propio
 *   producto" (con o sin guías en la biblioteca) apuntando ahí -- en
 *   DoctorProducts.jsx no se pasa porque esa pantalla ya tiene su propia
 *   tarjeta de "Crear producto" en la cuadrícula de abajo.
 * - title, description: textos del encabezado (opcionales)
 */
export default function GuideLibraryStrip({
  specialistId,
  specialty,
  products,
  onAdded,
  createOwnHref = null,
  title = "Biblioteca de guías para tu especialidad",
  description,
}) {
  const [guides, setGuides] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [addingGuideId, setAddingGuideId] = useState(null);
  const [viewingGuide, setViewingGuide] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!specialty) { setGuides([]); setLoaded(true); return; }
      const list = await base44.entities.Guide.filter({ specialty, status: "active" }, "-created_date", 100).catch(() => []);
      if (active) { setGuides(list); setLoaded(true); }
    })();
    return () => { active = false; };
  }, [specialty]);

  const addedGuideIds = useMemo(
    () => new Set((products || []).filter((p) => p.source_guide_id).map((p) => p.source_guide_id)),
    [products]
  );

  const addFromLibrary = async (guide) => {
    setAddingGuideId(guide.id);
    try {
      const created = await base44.entities.DoctorProduct.create({
        doctor_id: specialistId,
        source_guide_id: guide.id,
        title: guide.title,
        description: guide.description || "",
        price: guide.price,
        cover_image: guide.cover_image || null,
        images: Array.isArray(guide.images) ? guide.images : [],
        file_url: guide.file_url,
        status: "draft",
      });
      toast.success("Guía agregada a tu catálogo. Ajusta precio o descripción y actívala cuando quieras.");
      onAdded?.(created);
    } catch (e) {
      toast.error("No se pudo agregar: " + e.message);
    }
    setAddingGuideId(null);
  };

  if (!loaded) return null;
  const hasGuides = guides.length > 0;
  if (!hasGuides && !createOwnHref) return null;

  return (
    <div className="mb-7">
      <div className="flex items-center gap-2 mb-3">
        <BookOpen className="w-4 h-4 text-brand-blue" />
        <h2 className="font-heading font-bold text-base text-foreground">{title}</h2>
      </div>

      <p className="text-sm text-muted-foreground mb-3">
        {hasGuides
          ? (description || `Preparadas por BuscoUnDoctor para ${specialty || "tu especialidad"}. Agrégalas a tu catálogo y ajusta precio o descripción antes de activarlas.`)
          : `Todavía no hay guías preparadas por BuscoUnDoctor para ${specialty || "tu especialidad"}.`}
      </p>

      <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
        {guides.map((g) => {
          const added = addedGuideIds.has(g.id);
          const cover = (Array.isArray(g.images) && g.images[0]) || g.cover_image || null;
          return (
            <div key={g.id} className="flex-shrink-0 w-32">
              <button
                type="button"
                onClick={() => setViewingGuide(g)}
                className="w-32 h-44 rounded-lg bg-muted border border-border/50 flex items-center justify-center overflow-hidden shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                title="Leer guía"
              >
                {cover ? (
                  <img src={cover} alt={g.title} className="w-full h-full object-cover" />
                ) : (
                  <FileText className="w-8 h-8 text-muted-foreground/50" />
                )}
              </button>
              <p className="font-heading font-semibold text-xs text-foreground mt-2 line-clamp-2 leading-snug">{g.title}</p>
              <div className="mt-1.5">
                {added ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                    <CheckCircle2 className="w-3 h-3" /> Ya la agregaste
                  </span>
                ) : (
                  <Button
                    size="sm"
                    className="rounded-lg h-7 w-full px-2 text-xs"
                    disabled={addingGuideId === g.id}
                    onClick={() => addFromLibrary(g)}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {addingGuideId === g.id ? "Agregando..." : "Agregar"}
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        {/* "Producto fantasma": portada vacía con + para subir su propia guía,
            en vez de un botón de texto -- se ve como una guía más de la fila. */}
        {createOwnHref && (
          <Link to={createOwnHref} className="flex-shrink-0 w-32 group">
            <div className="w-32 h-44 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1.5 group-hover:border-brand-blue group-hover:bg-accent/20 transition-colors">
              <Plus className="w-7 h-7 text-muted-foreground/50 group-hover:text-brand-blue transition-colors" />
            </div>
            <p className="text-xs text-muted-foreground mt-2 leading-snug group-hover:text-foreground transition-colors">
              Subir tu guía personalizada
            </p>
          </Link>
        )}
      </div>

      {viewingGuide && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setViewingGuide(null)}>
          <div
            className="bg-card rounded-2xl w-full max-w-3xl h-[85vh] flex flex-col overflow-hidden shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 flex-shrink-0">
              <h2 className="font-heading font-semibold text-sm text-foreground line-clamp-1 pr-3">{viewingGuide.title}</h2>
              <button onClick={() => setViewingGuide(null)} aria-label="Cerrar" className="p-1.5 rounded-lg hover:bg-muted flex-shrink-0">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <iframe title={viewingGuide.title} src={viewingGuide.file_url} className="flex-1 w-full" />
          </div>
        </div>
      )}
    </div>
  );
}
