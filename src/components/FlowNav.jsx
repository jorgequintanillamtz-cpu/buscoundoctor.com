import { Link } from "react-router-dom";

// Menú flotante tipo píldora de vidrio del estilo "flow" (/recomendaciones-flow y /recomendado-flow/:slug):
// logo, enlaces a las secciones y un solo botón azul. Fondo azul marino translúcido para que se lea igual sobre
// el tramo claro y el oscuro del degradado. `base`: vacío en la propia página (anclas #doctores…); en otra
// página, la ruta de la landing ("/recomendaciones-flow"), que al cargar baja sola a la sección del ancla.
// `ctaTo`: a dónde lleva el botón "Recomendar" (por defecto, al formulario de la landing).
export default function FlowNav({ base = "", ctaTo = null }) {
  const link = "hidden md:inline-flex items-center h-9 px-3 rounded-full text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors";
  const To = ({ hash, className, children }) => (base
    ? <Link to={`${base}#${hash}`} className={className}>{children}</Link>
    : <a href={`#${hash}`} className={className}>{children}</a>);
  return (
    <nav className="fixed top-3 inset-x-0 z-50 flex justify-center px-3 pointer-events-none" aria-label="Secciones">
      <div className="pointer-events-auto flex items-center gap-1 h-14 pl-4 pr-2 rounded-full bg-brand-navy/45 backdrop-blur-md border border-white/15 shadow-lg shadow-brand-navy/20 w-full max-w-md md:w-auto md:max-w-none">
        <Link to={base || "/"} className="flex items-center mr-auto md:mr-3" aria-label="BuscoUnDoctor, inicio">
          {/* En celular, 20% más grande (29 px) que en computadora (24 px). */}
          <img src="/logo.webp" alt="BuscoUnDoctor" className="h-[29px] md:h-6 w-auto brightness-0 invert" />
        </Link>
        <To hash="doctores" className={link}>Doctores</To>
        <To hash="especialidades" className={link}>Especialidades</To>
        <To hash="preguntas" className={link}>Preguntas</To>
        {ctaTo
          ? <Link to={ctaTo} className="inline-flex items-center h-10 px-4 md:ml-2 rounded-full bg-brand-blue hover:bg-brand-blue/90 text-white text-sm font-semibold transition-colors">Recomendar</Link>
          : <To hash="formulario" className="inline-flex items-center h-10 px-4 md:ml-2 rounded-full bg-brand-blue hover:bg-brand-blue/90 text-white text-sm font-semibold transition-colors">Recomendar</To>}
      </div>
    </nav>
  );
}
