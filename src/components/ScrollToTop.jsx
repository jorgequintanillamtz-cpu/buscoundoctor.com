import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Sube la página hasta arriba cada vez que cambia la ruta (pathname).
 * React Router no hace esto por sí solo: al navegar a una página nueva,
 * el navegador conserva la posición de scroll de la página anterior.
 *
 * No interfiere con los enlaces ancla dentro de la misma página
 * (ej. href="#resenas"), porque esos no cambian el pathname.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
