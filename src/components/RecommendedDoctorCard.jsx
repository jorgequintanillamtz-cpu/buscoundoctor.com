import { Link } from "react-router-dom";
import { ArrowRight, Heart, ShieldQuestion, Star } from "lucide-react";
import RecommendedAvatar from "@/components/RecommendedAvatar";
import RecommendationMedal from "@/components/RecommendationMedal";
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
// `href`: a dónde lleva (por defecto su página de recomendado; un doctor registrado va a /especialista/…).
// `note`: una línea extra bajo la especialidad (p. ej. "Recomendado por 3 personas para limpieza dental").
// `unverified`: la etiqueta "Sin verificar" (por defecto sí; un perfil registrado y publicado no la lleva).
// `actions`: los botones "Ver recomendaciones" / "Yo también" de abajo (por defecto sí). El inicio los quita
// (2026-11-02, pedido de David): ahí toda la tarjeta (foto y datos) es el enlace a su página.
// `showSpecialty`: la especialidad en la línea de abajo del nombre (por defecto sí). `tags`: las etiquetas ("Buen trato",
// "Da seguimiento"…) (por defecto sí). El inicio quita la especialidad (2026-11-02, pedido de David) para que la vista vaya
// al sello de recomendaciones: la línea queda con la subespecialidad (si tiene) y la zona.
// `maxTags` / `maxTagsMobile`: cuántas etiquetas salen desde tableta (640 px) y en celular. El inicio vuelve a mostrarlas,
// 2 en computadora y 1 en celular (2026-11-02, pedido de David); sin estas props, como siempre (una línea en celular y
// todas desde tableta).
// `counter`: cómo se muestra el número de recomendaciones: "medal" (por defecto) = el sello dorado arriba a la derecha;
// "star" = una estrella verde con "5 Recomendaciones" justo bajo el nombre, sin sello (prueba del inicio, 2026-11-02,
// pedido de David).
export default function RecommendedDoctorCard({ d, count, showNew, onRecommend, href, note, unverified = true, actions = true, showSpecialty = true, tags = true, maxTags = 0, maxTagsMobile = 0, counter = "medal" }) {
  const to = href || `/recomendado-flow/${d.slug}`;
  const medal = counter !== "star"; // con el sello, nombre y zona dejan libre su lugar a la derecha
  const recs = Number(d.count) || 0;
  return (
    <div data-slug={d.slug} role="listitem"
      className={`relative snap-start shrink-0 overflow-hidden rounded-2xl border border-white/80 bg-white/60 backdrop-blur-sm shadow-sm shadow-brand-navy/5 hover:bg-white/80 transition-all flex flex-col ${flowSlideWidth(count)}`}>
      {/* Recomendaciones: sello dorado "RECOMENDADO" en la esquina, con el número adentro. */}
      {medal && <RecommendationMedal count={d.count} className="absolute top-3 right-3" />}
      <Link to={to} className="flex items-stretch gap-3 sm:gap-4 flex-1 pr-4">
        {/* Foto con "Sin verificar" encima, abajo. Ocupa todo el lado izquierdo de la tarjeta, del borde de arriba
            hasta la línea de los botones (celular y computadora). */}
        <div className="relative flex-shrink-0 w-28 lg:w-32 min-h-[10rem] lg:min-h-[11rem]">
          <RecommendedAvatar photo={d.photo} name={d.full_name} className="absolute inset-0 w-full h-full" shape="rounded-none" />
          {unverified && (
            <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-white/90 shadow-sm px-1.5 py-0.5 rounded-full whitespace-nowrap">
              <ShieldQuestion className="w-3 h-3" aria-hidden="true" /> Sin verificar
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1 py-3.5 sm:py-4 sm:pr-12">
          <p className={`font-heading font-semibold text-foreground break-words leading-snug ${medal ? "pr-12" : ""}`}>{d.full_name}</p>
          {!medal && (
            // 13 px en celular (a 14 "3 Recomendaciones" no cabía en un renglón en la tarjeta de 295 px) y el número va pegado a la
            // palabra (espacio sin salto) para que no se parta "3 / Recomendaciones"; en pantallas de menos de 360 px (la palabra
            // ya no cabe ni partida) solo quedan la estrella y el número, y la palabra la lee el lector de pantalla.
            <p className="mt-0.5 flex items-center gap-1 text-[13px] sm:text-sm text-brand-navy">
              <Star className="w-4 h-4 shrink-0 fill-emerald-500 text-emerald-500" aria-hidden="true" />
              <span><span className="font-semibold">{recs}</span><span className="max-[359px]:sr-only">{"\u00A0"}{recs === 1 ? "Recomendación" : "Recomendaciones"}</span></span>
            </p>
          )}
          {/* Con sello (pr-[2.4rem]): deja libre su lugar, que empieza a ~37 px del borde derecho del contenido. Sin sello, sin relleno. */}
          {[showSpecialty && d.specialty, d.subspecialty, d.zone].some(Boolean) && (
            <p className={`text-sm text-muted-foreground break-words ${medal ? "pr-[2.4rem]" : ""}`}>
              {[showSpecialty && d.specialty, d.subspecialty].filter(Boolean).join(" · ")}
              {[showSpecialty && d.specialty, d.subspecialty].some(Boolean) && d.zone && " "}
              {/* Ícono de ubicación (pin relleno con punto blanco, azul marino) junto a la zona, sin punto de separación con la
                  subespecialidad ni con la especialidad; "San Pedro Garza García" se muestra solo "San Pedro" (pedido de David,
                  2026-11-02; "San Pedro G. G." no le gustó). */}
              {d.zone && (() => {
                // El pin va pegado a la primera palabra de la zona (nunca solo al final de un renglón).
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
              })()}
            </p>
          )}
          {note && <p className="text-sm font-medium text-brand-flowDeep mt-1 break-words">{note}</p>}
          {showNew && isNew(d) && (
            <span className="inline-flex items-center mt-1.5 text-[11px] font-semibold text-brand-flowDeep bg-brand-flowMist px-2 py-0.5 rounded-full">Nuevo</span>
          )}
          {tags && (d.top_tags || []).length > 0 && (
            // En celular, una sola línea (lo que no cabe se oculta); desde tableta salen todas.
            <div className="flex flex-wrap gap-1.5 mt-2 max-h-6 overflow-hidden sm:max-h-none">
              {(maxTags ? d.top_tags.slice(0, maxTags) : d.top_tags).map((t, i) => (
                <span key={t.tag} className={`${maxTagsMobile && i >= maxTagsMobile ? "hidden sm:inline-block " : ""}max-w-full truncate text-xs leading-4 bg-brand-bluePale text-brand-navy px-2.5 py-1 rounded-full whitespace-nowrap`}>{recommendationTagLabel(t.tag)}{t.n > 1 ? ` · ${t.n}` : ""}</span>
              ))}
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
