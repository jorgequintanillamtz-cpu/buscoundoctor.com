import { Link } from "react-router-dom";

const LOGO_URL = "https://media.base44.com/images/public/69daf616236dcba44672309d/9f4cfcd01_buscoundoctor.webp";

/**
 * Logo de BuscoUnDoctor (imagen oficial).
 * La imagen tiene fondo negro, por lo que en fondos claros usamos
 * mix-blend-screen para que el negro se vuelva transparente y solo
 * quede el texto azul. En fondos oscuros se muestra tal cual.
 *
 * Props:
 *  - to: ruta del enlace (por defecto "/")
 *  - className: clases de tamaño (ej. "h-8")
 *  - blend: si true aplica mix-blend-screen (para fondos claros)
 */
export default function Logo({ to = "/", className = "h-8", blend = false, onClick }) {
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