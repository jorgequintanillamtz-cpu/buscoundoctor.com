import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import { applyDefaultOG, setOpenGraph, setCanonical } from "@/lib/seoMeta";
import { base44 } from "@/api/base44Client";

export default function Layout() {
  const location = useLocation();
  const [customOgImage, setCustomOgImage] = useState("");

  useEffect(() => {
    base44.entities.SiteSettings.list().then((list) => {
      setCustomOgImage(list[0]?.og_image_url || "");
    }).catch(() => {});
  }, []);

  // Aplica los OG/Twitter por defecto del sitio en cada cambio de ruta, para
  // que los overrides de una página no se filtren a la siguiente. Las
  // páginas fijan sus propios valores después de que cargan sus datos, lo
  // cual ocurre después de este efecto síncrono. Si el admin subió una
  // imagen de Open Graph personalizada, se aplica justo después del default
  // (las páginas específicas, como perfiles de doctor, la siguen pudiendo
  // sobreescribir después con la suya propia).
  //
  // También fija el <link rel="canonical"> a la ruta actual (sin query ni
  // hash) en cada cambio de página. Antes, index.html trae un canonical fijo
  // apuntando siempre a "/", y como ninguna otra página (salvo el blog) lo
  // corrige, Google recibe la señal de que TODO el sitio era la home. Las
  // páginas con filtros por query string (ej. /especialistas?specialty=X)
  // quedan apuntando así a su versión limpia, que es lo correcto.
  useEffect(() => {
    applyDefaultOG();
    if (customOgImage) setOpenGraph({ image: customOgImage });
    setCanonical(location.pathname);
  }, [location.pathname, customOgImage]);

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}