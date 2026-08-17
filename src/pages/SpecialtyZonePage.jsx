import { Navigate, useParams } from "react-router-dom";

// El sitio dejó de tener un nivel de zona/colonia dentro de cada ciudad
// (ver conversación de agosto 2026): ya no existen páginas
// /:professionSlug/:citySlug/:zonaSlug propias. Este componente sigue
// registrado en esa ruta solo para redirigir cualquier enlace ya
// compartido o indexado con ese patrón hacia la página de ciudad.
export default function SpecialtyZonePage() {
  const { professionSlug, citySlug } = useParams();
  return <Navigate to={`/${professionSlug}/${citySlug}`} replace />;
}
