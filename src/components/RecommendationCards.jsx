import { useState } from "react";
import { Heart, Quote, MoreVertical, Flag } from "lucide-react";
import ReportRecommendationDialog from "@/components/ReportRecommendationDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { recommendationTagLabel } from "@/lib/recommendationTags";

// Piezas compartidas de las recomendaciones de pacientes (CLAUDE.md §8r): se usan en la página de un doctor
// recomendado (/recomendado/:slug) y en el perfil de un doctor registrado (/especialista/:slug, pestaña
// "Recomendaciones"). Cada tarjeta: comentario (si el interruptor está encendido y está aprobado), etiquetas,
// y el primer nombre (si lo dejó) con mes y año. Cada tarjeta se puede reportar sin cuenta.

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export const commentMonth = (ym) => {
  const [y, m] = String(ym || "").split("-");
  return MONTHS[Number(m) - 1] ? `${MONTHS[Number(m) - 1]} ${y}` : "";
};

// Menú de 3 puntitos para reportar (cualquier persona puede, sin cuenta). `items`: [{ label, onSelect }]
export function ReportMenu({ items, ariaLabel }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label={ariaLabel || items[0].label} className="p-1.5 -m-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0">
          <MoreVertical className="w-4 h-4" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {items.map((it) => (
          <DropdownMenuItem key={it.label} onSelect={it.onSelect} className="gap-2 cursor-pointer"><Flag className="w-4 h-4" aria-hidden="true" /> {it.label}</DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Lista de recomendaciones (las 10 más recientes y "Ver las N" para el resto). `slug` es el enlace del doctor
// (de la página de recomendado o de su perfil registrado): sirve para reportar.
export default function RecommendationCards({ slug, recommendations }) {
  const [showAll, setShowAll] = useState(false);
  const [report, setReport] = useState(null); // { id, kind, what }
  const list = recommendations || [];
  return (
    <>
      <ul className="space-y-2.5">
        {(showAll ? list : list.slice(0, 10)).map((r) => (
          <li key={r.id} className="rounded-xl bg-muted/50 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              {r.comment ? (
                <p className="text-sm text-foreground flex gap-2"><Quote className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" aria-hidden="true" /><span className="break-words">{r.comment}</span></p>
              ) : (r.tags || []).length === 0 ? (
                <p className="text-sm text-foreground">Recomienda a este doctor.</p>
              ) : <span />}
              <ReportMenu
                ariaLabel="Reportar"
                items={[
                  { label: "Reportar recomendación", onSelect: () => setReport({ id: r.id, kind: "recommendation", what: "la recomendación" }) },
                  ...(r.comment ? [{ label: "Reportar comentario", onSelect: () => setReport({ id: r.id, kind: "comment", what: "el comentario" }) }] : []),
                ]}
              />
            </div>
            {(r.tags || []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {r.tags.map((t) => <span key={t} className="text-xs bg-white text-brand-navy px-2.5 py-1 rounded-full border border-brand-canvasBorder">{recommendationTagLabel(t)}</span>)}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" aria-hidden="true" /> {r.name ? <><span className="font-medium text-foreground">{r.name}</span> · </> : null}{commentMonth(r.month)}
            </p>
          </li>
        ))}
      </ul>
      {list.length > 10 && !showAll && (
        <button type="button" onClick={() => setShowAll(true)} className="mt-3 text-sm font-medium text-brand-blue hover:underline">Ver las {list.length} recomendaciones</button>
      )}
      <ReportRecommendationDialog open={!!report} onOpenChange={(o) => { if (!o) setReport(null); }} slug={slug} commentId={report?.id || null} kind={report?.kind || null} what={report?.what || "la recomendación"} />
    </>
  );
}
