import { useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Apple, Baby, Brain, Droplet, Flower2, HeartPulse, Pill, Sparkles, Stethoscope } from "lucide-react";
import ToothIcon from "@/components/icons/ToothIcon";
import CardSlider from "@/components/CardSlider";
import { findSpecialtyLanding } from "@/lib/specialtyLandings";
import { TOP_SPECIALTY_SLUGS } from "@/lib/topSpecialties";
import { utmQuery, withUtm } from "@/lib/utm";
import { trackEvent } from "@/lib/trackEvent";

// "Recomendados por especialidad" (2026-11-02, pedido de David): primer carrusel del inicio, debajo del formulario y
// antes de los carruseles de doctores; solo en el paso 1 (RecomendacionesFlow.jsx). Una tarjeta por cada una de las 10
// especialidades principales, en el orden de topSpecialties.js (title/from en specialtyLandings.js), con enlace a su
// página /<llave>, conservando los utm_* de la visita. En celular el título no se ve (sigue para lectores de pantalla,
// sr-only) y las tarjetas son 20% más grandes (pedido de David, 2026-11-02).
// Estilo "vidrio claro" (elegido por David el 2026-11-02 entre dos propuestas): el hex de la especialidad al 74% con
// desenfoque del fondo (antes 62%; se subió para que el color no se viera apagado), borde blanco fino y brillo suave
// arriba. Las capas viven en .cat-card (index.css), que pone el color SÓLIDO si el navegador no tiene backdrop-filter o
// el usuario pidió reducir transparencias. Nombre e ícono de la especialidad en BLANCO por decisión de David, sabiendo
// que el nombre NO llega a 4.5:1 sobre estos tonos (medidos en specialtyLandings.js); con azul marino sí llegaba. El
// ícono es decorativo (aria-hidden: el nombre ya lo dice). Dentista usa ToothIcon (lucide no trae diente).
// Medición (Clarity): al tocar una categoría se registra "home_categoria_<llave>" (sin datos personales). Para apagarlo,
// cambia esto a false.
const TRACK_HOME_CATEGORY = true;
const ICONS = {
  "medico-general": Stethoscope, ginecologo: Flower2, pediatra: Baby, dentista: ToothIcon, dermatologo: Sparkles,
  cardiologo: HeartPulse, psicologo: Brain, nutriologo: Apple, endocrinologo: Droplet, gastroenterologo: Pill,
};
// Contador de recomendaciones de cada tarjeta ("Ginecólogo – 5", pedido de David, 2026-11-02): suma `count` (sus
// recomendaciones aprobadas) de los doctores de la landing (list_recommendations_landing, la misma consulta que el
// contador del hero) cuya especialidad coincide, sin acentos ni mayúsculas, con estas raíces (las mismas que usan los
// carruseles y las tarjetas de especialidades de RecommendationsLandingFlow.jsx). Mientras carga o si falla, sin número.
const MATCH = {
  "medico-general": /medic(o|ina) general/, ginecologo: /ginecolog/, pediatra: /^pediatr/, dentista: /dentist|odont/,
  dermatologo: /dermatolog/, cardiologo: /cardiolog/, psicologo: /psicolog/, nutriologo: /nutri/, endocrinologo: /endocrin/,
  gastroenterologo: /gastro/,
};
const norm = (t) => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const recsFor = (key, doctors) => doctors.filter((d) => MATCH[key]?.test(norm(d.specialty)))
  .reduce((n, d) => n + (Number(d.count) || 0), 0);
const rgbOf = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(" ");
const cardVars = (c) => ({
  "--cat-solid": c.from,
  "--cat-glass": `rgb(${rgbOf(c.from)} / 0.74)`,
  "--cat-layers": "linear-gradient(180deg, rgb(255 255 255 / 0.30) 0%, rgb(255 255 255 / 0) 22%)",
});
// Ancho: en celular, media tarjeta + una entera + media (pedido de David, 2026-11-02, para que se note que hay más):
// el carrusel llega de orilla a orilla (100% + los 2 rem de margen), menos 2 huecos de 0.75 rem, entre 2. Las tarjetas
// se centran al deslizar (snap-center) y al cargar se centra Ginecólogo. En tableta 3 y un pedazo; en computadora 4 y
// un pedazo (alineadas al inicio). El alto sigue la proporción 16:9.
const MOBILE = "(max-width: 639px)";
const SLIDE = "w-[calc((100%_+_0.5rem)/2)] sm:w-[calc((100%_-_2.25rem)/3.3)] lg:w-[calc((100%_-_3rem)/4.5)]";
// Con teclado: si la tarjeta que recibe el foco no se ve completa (el navegador no desplaza el carrusel si ya se ve a
// medias, como la que asoma), se centra (celular) o se alinea al inicio (tableta y computadora), igual que el "snap" de
// las tarjetas. Sin animación si el usuario pidió reducir el movimiento.
const showWhole = (e) => {
  const card = e.currentTarget;
  const list = card.parentElement;
  if (!list) return;
  const c = card.getBoundingClientRect();
  const l = list.getBoundingClientRect();
  if (c.left >= l.left - 1 && c.right <= l.right + 1) return;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const pad = parseFloat(getComputedStyle(list).scrollPaddingLeft) || 0;
  const offset = window.matchMedia?.(MOBILE).matches ? (l.width - c.width) / 2 : pad;
  list.scrollTo({ left: list.scrollLeft + (c.left - l.left) - offset, behavior: reduce ? "auto" : "smooth" });
};

export default function HomeCategorySlider({ data }) {
  const { search } = useLocation();
  const utm = utmQuery(search);
  const items = TOP_SPECIALTY_SLUGS.map((slug) => findSpecialtyLanding(slug)).filter(Boolean);
  const ref = useRef(null);
  // Celular: al cargar, la segunda tarjeta (Ginecólogo) centrada, con media de Médico General y media de Pediatra.
  useEffect(() => {
    if (!window.matchMedia?.(MOBILE).matches) return;
    const list = ref.current?.querySelector("[role=list]");
    const card = list?.children[1];
    if (!card) return;
    const l = list.getBoundingClientRect();
    const c = card.getBoundingClientRect();
    list.scrollLeft += c.left + c.width / 2 - (l.left + l.width / 2);
  }, []);
  if (items.length === 0) return null;

  return (
    <section ref={ref} aria-labelledby="home-categorias" className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 pt-6 pb-0 sm:pt-2 sm:pb-10">
      <h2 id="home-categorias" className="sr-only sm:not-sr-only font-heading font-medium tracking-tight text-xl sm:text-2xl text-brand-navy">Recomendados por especialidad</h2>
      <CardSlider resetKey="categorias" label="Recomendados por especialidad" prevLabel="Ver especialidades anteriores"
        nextLabel="Ver más especialidades" dots={false} bleed className="sm:mt-2.5">
        {items.map((c) => {
          const Icon = ICONS[c.key];
          const recs = data && Array.isArray(data.doctors) ? recsFor(c.key, data.doctors) : null;
          return (
            <Link key={c.key} to={withUtm(`/${c.key}`, utm)} role="listitem" lang="es" onFocus={showWhole}
              onClick={() => { if (TRACK_HOME_CATEGORY) trackEvent(`home_categoria_${c.key}`); }}
              style={cardVars(c)}
              className={`cat-card snap-center sm:snap-start shrink-0 ${SLIDE} aspect-[16/9] min-h-11 relative rounded-2xl border border-white/50 p-3 sm:p-4 flex items-end
                outline-none focus-visible:ring-4 focus-visible:ring-brand-navy focus-visible:ring-offset-2 focus-visible:ring-offset-brand-flowMist
                motion-safe:transition-transform motion-safe:hover:-translate-y-0.5`}>
              <span className="font-heading font-semibold text-white text-base sm:text-xl lg:text-2xl leading-tight hyphens-auto break-words min-w-0">
                {c.title}
                {recs !== null && (
                  <>
                    <span aria-hidden="true"> – {recs}</span>
                    <span className="sr-only">, {recs} {recs === 1 ? "recomendación" : "recomendaciones"}</span>
                  </>
                )}
              </span>
              {Icon && <Icon aria-hidden="true" strokeWidth={1.75} className="absolute top-2 right-2 sm:top-3.5 sm:right-3.5 w-[1.44rem] h-[1.44rem] sm:w-[2.1rem] sm:h-[2.1rem] lg:w-[2.4rem] lg:h-[2.4rem] text-white" />}
            </Link>
          );
        })}
      </CardSlider>
    </section>
  );
}
