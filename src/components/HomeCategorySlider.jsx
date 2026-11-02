import { Link, useLocation } from "react-router-dom";
import { Apple, Baby, Brain, Droplet, Flower2, HeartPulse, Pill, Smile, Sparkles, Stethoscope } from "lucide-react";
import CardSlider from "@/components/CardSlider";
import { findSpecialtyLanding } from "@/lib/specialtyLandings";
import { TOP_SPECIALTY_SLUGS } from "@/lib/topSpecialties";
import { utmQuery, withUtm } from "@/lib/utm";
import { trackEvent } from "@/lib/trackEvent";

// "Recomendados por especialidad" (2026-11-02, pedido de David): primer carrusel del inicio, debajo del formulario y
// antes de los carruseles de doctores; solo en el paso 1 (RecomendacionesFlow.jsx). Una tarjeta por cada una de las 10
// especialidades principales, en el orden de topSpecialties.js (title/from en specialtyLandings.js), con enlace a su
// página /<llave>, conservando los utm_* de la visita.
// Estilo "vidrio claro" (versión A, elegida por David entre dos propuestas): el hex de la especialidad al 62% con
// desenfoque del fondo, borde blanco fino, brillo suave arriba y el nombre en azul marino (de 6.7:1 a 12.3:1 medido en
// el navegador sobre el fondo real). Las capas viven en .cat-card (index.css), que pone el color SÓLIDO si el navegador
// no tiene backdrop-filter o el usuario pidió reducir transparencias. Ícono de la especialidad en blanco arriba a la
// derecha (decorativo, aria-hidden: el nombre ya lo dice).
// Medición (Clarity): al tocar una categoría se registra "home_categoria_<llave>" (sin datos personales). Para apagarlo,
// cambia esto a false.
const TRACK_HOME_CATEGORY = true;
const ICONS = {
  "medico-general": Stethoscope, ginecologo: Flower2, pediatra: Baby, dentista: Smile, dermatologo: Sparkles,
  cardiologo: HeartPulse, psicologo: Brain, nutriologo: Apple, endocrinologo: Droplet, gastroenterologo: Pill,
};
const rgbOf = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(" ");
const cardVars = (c) => ({
  "--cat-solid": c.from,
  "--cat-glass": `rgb(${rgbOf(c.from)} / 0.62)`,
  "--cat-layers": "linear-gradient(180deg, rgb(255 255 255 / 0.30) 0%, rgb(255 255 255 / 0) 22%)",
});
// Ancho: en celular 2 tarjetas y un pedazo de la tercera; en tableta 3 y un pedazo; en computadora 4 y un pedazo.
const SLIDE = "w-[calc((100%_-_1.5rem)/2.3)] sm:w-[calc((100%_-_2.25rem)/3.3)] lg:w-[calc((100%_-_3rem)/4.5)]";
// Con teclado: si la tarjeta que recibe el foco no se ve completa (el navegador no desplaza el carrusel si ya se ve a
// medias, como la que asoma), se alinea al inicio del carrusel, que coincide con el "snap" de las tarjetas. Sin
// animación si el usuario pidió reducir el movimiento.
const showWhole = (e) => {
  const card = e.currentTarget;
  const list = card.parentElement;
  if (!list) return;
  const c = card.getBoundingClientRect();
  const l = list.getBoundingClientRect();
  if (c.left >= l.left - 1 && c.right <= l.right + 1) return;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const pad = parseFloat(getComputedStyle(list).scrollPaddingLeft) || 0;
  list.scrollTo({ left: list.scrollLeft + (c.left - l.left) - pad, behavior: reduce ? "auto" : "smooth" });
};

export default function HomeCategorySlider() {
  const { search } = useLocation();
  const utm = utmQuery(search);
  const items = TOP_SPECIALTY_SLUGS.map((slug) => findSpecialtyLanding(slug)).filter(Boolean);
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="home-categorias" className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 pt-2 pb-8 sm:pb-10">
      <h2 id="home-categorias" className="font-heading font-medium tracking-tight text-xl sm:text-2xl text-brand-navy">Recomendados por especialidad</h2>
      <CardSlider resetKey="categorias" label="Recomendados por especialidad" prevLabel="Ver especialidades anteriores"
        nextLabel="Ver más especialidades" dots={false} bleed className="mt-4">
        {items.map((c) => {
          const Icon = ICONS[c.key];
          return (
            <Link key={c.key} to={withUtm(`/${c.key}`, utm)} role="listitem" lang="es" onFocus={showWhole}
              onClick={() => { if (TRACK_HOME_CATEGORY) trackEvent(`home_categoria_${c.key}`); }}
              style={cardVars(c)}
              className={`cat-card snap-start shrink-0 ${SLIDE} aspect-[16/9] min-h-11 relative rounded-2xl border border-white/50 p-3 sm:p-4 flex items-end
                outline-none focus-visible:ring-4 focus-visible:ring-brand-navy focus-visible:ring-offset-2 focus-visible:ring-offset-brand-flowMist
                motion-safe:transition-transform motion-safe:hover:-translate-y-0.5`}>
              <span className="font-heading font-semibold text-brand-navy text-base sm:text-xl lg:text-2xl leading-tight hyphens-auto break-words min-w-0">
                {c.title}
              </span>
              {Icon && <Icon aria-hidden="true" strokeWidth={1.75} className="absolute top-2 right-2 sm:top-3.5 sm:right-3.5 w-4 h-4 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-white" />}
            </Link>
          );
        })}
      </CardSlider>
    </section>
  );
}
