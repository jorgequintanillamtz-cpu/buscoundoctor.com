import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Loader2, FileText } from "lucide-react";
import { getStorefrontTheme, CREAM, INK } from "@/lib/storefrontThemes";
import PublicReviewBlock from "@/components/consult/PublicReviewBlock";
import HandwrittenSummary from "@/components/consult/HandwrittenSummary";
import StorefrontProducts from "@/components/storefront/StorefrontProducts";

/**
 * Página pública del resumen de consulta.
 * Ruta: /resumen/:id
 *
 * - Pública, sin login, fuera del Layout (sin branding de BuscoUnDoctor).
 * - Muestra el summary_text del ConsultSummary (vía getPublicConsultSummary).
 * - NO muestra patient_phone ni patient_name (dato sensible).
 * - Debajo: bloque de reseña (5 estrellas tappeable, una por link).
 * - Debajo: si el doctor tiene storefront_slug Y productos activos, muestra
 *   la sección de productos reutilizando StorefrontProducts. Si falta
 *   cualquiera de los dos, la sección se omite sin romper la página.
 */
export default function ConsultSummaryPublic() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [data, setData] = useState(null);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const res = await base44.functions.invoke("getPublicConsultSummary", { id });
        if (cancelled) return;
        const d = res?.data || res;
        if (!d || d.error) {
          setNotFound(true);
        } else {
          setData(d);
          // Solo buscar productos si hay storefront_slug (sin slug, el link
          // /dr/[slug]/producto/[id] se rompería)
          if (d.storefront_slug && d.doctor_id) {
            try {
              const pres = await base44.functions.invoke("getPublicDoctorProducts", {
                doctor_id: d.doctor_id,
              });
              if (cancelled) return;
              const prods = pres?.data?.products || pres?.products || [];
              setProducts(prods);
            } catch {
              // Sin productos, sección omitida
            }
          }
        }
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0B1E4D" }}>
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center"
        style={{ background: "#0B1E4D" }}
      >
        <p className="text-white font-heading font-bold text-lg">Resumen no encontrado</p>
        <p className="text-white/60 text-sm">El link puede haber expirado o ser incorrecto.</p>
      </div>
    );
  }

  const theme = getStorefrontTheme("navy");
  // Solo se muestran productos si hay storefront_slug Y productos activos
  const showProducts = data.storefront_slug && products.length > 0;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: theme.bg }}>
      {/* Header */}
      <header
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ background: CREAM }}
      >
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4" style={{ color: INK }} />
          <span className="text-sm font-semibold" style={{ color: INK }}>Resumen de consulta</span>
        </div>
        {data.doctor_name && (
          <span className="text-xs font-medium truncate max-w-[55%]" style={{ color: INK }}>
            {data.doctor_name}
          </span>
        )}
      </header>

      <main className="max-w-md w-full mx-auto px-5 py-6 space-y-6 flex-1">
        {/* 1. Summary text + reseña (integrada en tarjetas manuscritas) */}
        <section>
          {data.summary_theme === "default" && (
            <h2 className="font-heading font-bold text-lg text-white mb-3">Tu resumen</h2>
          )}
          {data.summary_theme === "default" ? (
            <div
              className="rounded-2xl p-4"
              style={{ background: theme.card, border: `1px solid ${theme.border}` }}
            >
              <p className="text-white/90 text-sm leading-relaxed whitespace-pre-line">
                {data.summary_text}
              </p>
            </div>
          ) : (
            <HandwrittenSummary
              summaryText={data.summary_text}
              doctorName={data.doctor_name}
              doctorPhoto={data.doctor_photo}
              font={data.summary_theme === "handwritten_caveat" ? "caveat" : "kalam"}
              signatureStrokes={data.signature_strokes}
            >
              <PublicReviewBlock consultSummaryId={id} variant="light" />
            </HandwrittenSummary>
          )}
        </section>

        {/* 2. Review block (solo tema clásico) */}
        {data.summary_theme === "default" && (
          <section
            className="rounded-2xl p-4"
            style={{ background: theme.card, border: `1px solid ${theme.border}` }}
          >
            <PublicReviewBlock consultSummaryId={id} />
          </section>
        )}

        {/* 3. Productos (solo si storefront_slug Y productos activos) */}
        {showProducts && (
          <section>
            <StorefrontProducts
              items={products}
              theme={theme}
              storefrontSlug={data.storefront_slug}
            />
          </section>
        )}
      </main>
    </div>
  );
}