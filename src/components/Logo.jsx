import { Link } from "react-router-dom";

const LOGO_URL = "/logo.webp";

/**
 * Logo de BuscoUnDoctor (imagen oficial, fondo transparente real).
 *
 * Props:
 *  - to: ruta del enlace (por defecto "/")
 *  - className: clases de tamaño (ej. "h-8")
 */
export default function Logo({ to = "/", className = "h-8", onClick }) {
  return (
    <Link to={to} onClick={onClick} className="flex items-center flex-shrink-0">
      <img
        src={LOGO_URL}
        alt="BuscoUnDoctor"
        className={`${className} w-auto`}
      />
    </Link>
  );
}