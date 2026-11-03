import { Link } from "react-router-dom";
import { ArrowRight, Heart, ShieldQuestion } from "lucide-react";
import RecommendedAvatar from "@/components/RecommendedAvatar";
import { recommendationTagLabel } from "@/lib/recommendationTags";

// Tarjeta de doctor recomendado del estilo "flow" (inicio y /recomendados/:especialidad). Salió de
// RecommendationsLandingFlow.jsx el 2026-11-01 sin cambios visuales.
const NEW_DAYS = 7; // "Nuevo": recomendado en los últimos 7 días
const DAY_MS = 86400000;
const isNew = (d) => !!d.last_at && Date.now() - new Date(d.last_at).getTime() <= NEW_DAYS * DAY_MS;

// Ancho de cada tarjeta en los carruseles de esta página: en celular una y un pedacito de la siguiente; en tableta
// dos y un pedacito; desde computadora (sección más ancha, 1400 px) tres y un pedacito de la cuarta. Con una sola
// tarjeta, del MISMO ancho que las demás y centrada (antes `w-full max-w-md`: se veía más larga que las de los otros
// carruseles; pedido de David, 2026-11-02).
const SLIDE_WIDTH = "w-[calc(100%_-_3rem)] sm:w-[calc((100%_-_3.75rem)/2)] lg:w-[calc((100%_-_4.5rem)/3)]";
export const flowSlideWidth = (n) => (n === 1 ? `${SLIDE_WIDTH} mx-auto` : SLIDE_WIDTH);

// Tarjeta de un doctor recomendado (la usan todos los carruseles). `count` = cuántas hay en su carrusel (ancho).
// Diseño "catálogo" (2026-11-02, pedido de Jorge, tras la primera versión "reputación"): como una tarjeta de producto de
// Amazon. SIN foto (casi todos) un avatar redondo chico; arriba el nombre, luego especialidad/zona, luego **la fila de
// reputación: un corazón y entre paréntesis "(2 recomendaciones)"**, luego sus etiquetas principales (2) y al final las
// etiquetas chicas ("Sin verificar", "Nuevo"). CON foto real se queda el panel de foto a la izquierda. Se probaron 5 estrellas y
// Jorge las descartó (todas serían "5 de 5": se leen como calificación); ver CLAUDE.md §8r, Paso 53.
// `href`: a dónde lleva (por defecto su página de recomendado; un doctor registrado va a /especialista/…).
// `note`: una línea extra bajo la zona (p. ej. "Recomendado por 3 personas para limpieza dental").
// `unverified`: la etiqueta "Sin verificar" (por defecto sí; un perfil registrado y publicado no la lleva).
// `actions`: los botones "Ver recomendaciones" / "Yo también" de abajo (por defecto sí). El inicio los quita
// (2026-11-02, pedido de David): ahí toda la tarjeta es el enlace a su página.
// `showSpecialty`: la especialidad junto a la subespecialidad (por defecto sí). El inicio la quita (David).
// `tags`: las etiquetas ("Buen trato"…) dentro del recuadro (por defecto sí). `maxTags` / `maxTagsMobile`: cuántas salen desde
// tableta (640 px) y en celular; sin ellas, hasta 3.
export default function RecommendedDoctorCard({ d, count, showNew, onRecommend, href, note, unverified = true, actions = true, showSpecialty = true, tags = true, maxTags = 0, maxTagsMobile = 0 }) {
  const to = href || `/recomendado-flow/${d.slug}`;
  const recs = Number(d.count) || 0;
  const hasPhoto = !!d.photo;
  const shownTags = tags ? (maxTags ? (d.top_tags || []).slice(0, maxTags) : (d.top_tags || []).slice(0, 3)) : [];
  const pill = unverified && (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-white/80 shadow-sm px-1.5 py-0.5 rounded-full whitespace-nowrap">
      <ShieldQuestion className="w-3 h-3" aria-hidden="true" /> Sin verificar
    </span>
  );
  const place = d.zone ? (() => {
    // El pin va pegado a la primera palabra de la zona (nunca solo al final de un renglón); "San Pedro Garza García" se muestra "San Pedro".
    const [first, ...rest] = d.zone.replace(/San Pedro Garza Garc[ií]a/i, "San Pedro").split(" ");
    return (
      <>
        <span className="whitespace-nowrap">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="inline-block w-[15px] h-[15px] -mt-0.5 mr-1 align-middle text-brand-navy">
            <path fill="currentColor" d="M12 2a7.5 7.5 0 0 0-7.5 7.5c0 5.3 6 11.3 6.8 12.1a1 1 0 0 0 1.4 0c.8-.8 6.8-6.8 6.8-12.1A7.5 7.5 0 0 0 12 2Z" />
            <circle cx="12" cy="9.5" r="2.7" fill="#fff" />
          </svg>
          {first}
        </span>
        {rest.length > 0 && ` ${rest.join(" ")}`}
      </>
    );
  })() : null;
  const lead = [showSpecialty && d.specialty, d.subspecialty].filter(Boolean).join(" · ");
  return (
    <div data-slug={d.slug} role="listitem"
      className={`relative snap-start shrink-0 overflow-hidden rounded-2xl border border-white/80 bg-white/60 backdrop-blur-sm shadow-sm shadow-brand-navy/5 hover:bg-white/80 transition-all flex flex-col ${flowSlideWidth(count)}`}>
      <Link to={to} className={hasPhoto ? "flex items-stretch gap-3 sm:gap-4 flex-1 pr-3.5 sm:pr-4" : "flex flex-col gap-3 flex-1 p-3.5 sm:p-4"}>
        {hasPhoto && (
          // Con foto real: el panel de foto a la izquierda, del borde de arriba hasta la línea de los botones.
          <div className="relative flex-shrink-0 w-28 lg:w-32 min-h-[10rem] lg:min-h-[11rem]">
            <RecommendedAvatar photo={d.photo} name={d.full_name} className="absolute inset-0 w-full h-full" shape="rounded-none" />
          </div>
        )}
        <div className={`min-w-0 flex-1 ${hasPhoto ? "py-3.5 sm:py-4" : ""}`}>
          <div className="flex items-start gap-3">
            {!hasPhoto && <RecommendedAvatar photo={d.photo} name={d.full_name} className="w-12 h-12 sm:w-14 sm:h-14" />}
            <div className="min-w-0 flex-1">
              <p className="font-heading font-semibold text-foreground break-words leading-snug">{d.full_name}</p>
              {(lead || place) && (
                <p className="text-sm text-muted-foreground break-words">
                  {lead}{lead && place && " "}{place}
                </p>
              )}
              {note && <p className="text-sm font-medium text-brand-flowDeep mt-1 break-words">{note}</p>}
            </div>
          </div>

          {/* Reputación: un corazón y entre paréntesis "(N recomendaciones)" (decisión de Jorge: antes eran 5 estrellas, que se leían
              como una calificación). */}
          <p className="mt-1.5 flex items-center gap-1.5 text-sm">
            <Heart className="w-[18px] h-[18px] flex-shrink-0 fill-red-500 text-red-500" aria-hidden="true" />
            <span className="text-brand-blue font-medium">({recs} {recs === 1 ? "recomendación" : "recomendaciones"})</span>
          </p>
          {shownTags.length > 0 && (
            // Las etiquetas principales como etiquetas (cada una entera, sin partirse a medias): 2 también en celular.
            <div className="flex flex-wrap gap-1.5 mt-2">
              {shownTags.map((t, i) => (
                <span key={t.tag} className={`${maxTagsMobile && i >= maxTagsMobile ? "hidden sm:inline-block " : ""}max-w-full truncate text-xs leading-4 bg-brand-bluePale text-brand-navy px-2.5 py-1 rounded-full whitespace-nowrap`}>{recommendationTagLabel(t.tag)}</span>
              ))}
            </div>
          )}
          {(unverified || (showNew && isNew(d))) && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {pill}
              {showNew && isNew(d) && <span className="inline-flex items-center text-[11px] font-semibold text-brand-flowDeep bg-brand-flowMist px-2 py-0.5 rounded-full">Nuevo</span>}
            </div>
          )}
        </div>
      </Link>
      {actions && (
      <div className="flex flex-wrap gap-2 mx-4 mb-3.5 sm:mb-4 pt-3 border-t border-white/80">
        <Link to={to}
          className="inline-flex items-center justify-center gap-1.5 h-10 lg:h-9 px-2.5 sm:px-3 rounded-full bg-brand-navy hover:bg-brand-navy/90 text-white text-[13px] font-semibold whitespace-nowrap transition-colors flex-1 min-w-fit">
          Ver recomendaciones <ArrowRight className="w-3.5 h-3.5 hidden sm:block" aria-hidden="true" />
        </Link>
        {onRecommend && (
          <button type="button" onClick={() => onRecommend(d.slug)} aria-label={`Yo también lo recomiendo: ${d.full_name}`}
            className="inline-flex items-center justify-center gap-1.5 h-10 lg:h-9 px-2.5 sm:px-3 rounded-full border border-white bg-white/70 text-brand-navy hover:bg-white text-[13px] font-semibold whitespace-nowrap transition-colors flex-1 lg:flex-1 min-w-fit">
            {/* Etiqueta corta "Yo también" (el nombre completo va en aria-label) para que los dos botones quepan en una fila; corazón desde computadora. */}
            <Heart className="w-3.5 h-3.5 hidden lg:block" aria-hidden="true" /> Yo también
          </button>
        )}
      </div>
      )}
    </div>
  );
}
