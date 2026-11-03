import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";

// Menú flotante tipo píldora de vidrio del estilo "flow" (/recomendaciones-flow y /recomendado-flow/:slug):
// logo, enlaces a las secciones y un solo botón azul. Fondo azul marino translúcido para que se lea igual sobre
// el tramo claro y el oscuro del degradado. `base`: vacío en la propia página (anclas #doctores…); en otra
// página, la ruta de la landing ("/recomendaciones-flow"), que al cargar baja sola a la sección del ancla.
// `ctaTo`: a dónde lleva el botón "Recomendar" (por defecto, al formulario de la landing).
// `onSearch`: si existe, en celular el botón "Recomendar" se cambia por una lupa que abre el buscador de doctores.
// Casi sólido (90%) para que no se vea pasar el texto por detrás (2026-11-03, pedido de Jorge).
// En celular (menos de 768 px) se esconde deslizándose hacia arriba al bajar por la página y vuelve al subir o al llegar arriba
// (pedido de Jorge, 2026-11-03); en computadora siempre está visible.
// `onRecommend`: si existe, en celular sale un botón "Recomendar" junto a la lupa (el inicio ya no tiene botón flotante abajo;
// la acción principal vive aquí) y la lupa pasa a ser un botón discreto; en computadora sigue el enlace de siempre.
// `zoomDesktop`: en computadora (desde lg, 1024 px) el menú se ve al 115% (lo usa el inicio, cuya portada también va al 115%).
export default function FlowNav({ base = "", ctaTo = null, onSearch = null, onRecommend = null, zoomDesktop = false }) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (!mq.matches || y <= 80) setHidden(false);   // en computadora o cerca del inicio, siempre visible
      else if (y - last > 8) setHidden(true);         // bajando
      else if (last - y > 8) setHidden(false);        // subiendo
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const cta = `${onSearch || onRecommend ? "hidden md:inline-flex" : "inline-flex"} items-center h-10 px-4 md:ml-2 rounded-full bg-brand-blue hover:bg-brand-blue/90 text-white text-sm font-semibold transition-colors`;
  const link = "hidden md:inline-flex items-center h-9 px-3 rounded-full text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors";
  const To = ({ hash, className, children }) => (base
    ? <Link to={`${base}#${hash}`} className={className}>{children}</Link>
    : <a href={`#${hash}`} className={className}>{children}</a>);
  return (
    <nav className={`fixed top-3 inset-x-0 z-50 flex justify-center px-3 pointer-events-none transition-transform duration-300 ${hidden ? "-translate-y-[130%] md:translate-y-0" : "translate-y-0"}`} aria-label="Secciones" aria-hidden={hidden ? "true" : undefined}>
      <div className={`pointer-events-auto flex items-center gap-1 h-14 pl-4 pr-2 rounded-full bg-brand-navy/90 backdrop-blur-md border border-white/15 shadow-lg shadow-brand-navy/20 w-full max-w-md md:w-auto md:max-w-none ${zoomDesktop ? "lg:[zoom:1.15]" : ""}`}>
        <Link to={base || "/"} className="flex items-center mr-auto md:mr-3" aria-label="BuscoUnDoctor, inicio">
          {/* En celular, 20% más grande (29 px) que en computadora (24 px). */}
          <img src="/logo.webp" alt="BuscoUnDoctor" className="h-[29px] md:h-6 w-auto brightness-0 invert" />
        </Link>
        <To hash="doctores" className={link}>Doctores</To>
        <To hash="especialidades" className={link}>Especialidades</To>
        <To hash="preguntas" className={link}>Preguntas</To>
        {ctaTo
          ? <Link to={ctaTo} className={cta}>Recomendar</Link>
          : <To hash="formulario" className={cta}>Recomendar</To>}
        {onRecommend && (
          <button type="button" onClick={onRecommend}
            className="md:hidden inline-flex items-center h-10 px-4 rounded-full bg-brand-blue hover:bg-brand-blue/90 text-white text-sm font-semibold transition-colors">
            Recomendar
          </button>
        )}
        {onSearch && (
          <button type="button" onClick={onSearch} aria-label="Buscar un doctor"
            className={`md:hidden w-10 h-10 rounded-full text-white flex items-center justify-center transition-colors ${onRecommend ? "bg-white/15 hover:bg-white/25" : "bg-brand-blue hover:bg-brand-blue/90"}`}>
            <Search className="w-5 h-5" aria-hidden="true" />
          </button>
        )}
      </div>
    </nav>
  );
}
