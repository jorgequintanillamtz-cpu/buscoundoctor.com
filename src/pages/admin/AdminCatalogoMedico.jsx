import { useParams, useNavigate, Navigate } from "react-router-dom";
import { Heart, GraduationCap, ListChecks } from "lucide-react";
import AdminSpecialties from "./AdminSpecialties";
import AdminSubespecialidades from "./AdminSubespecialidades";
import AdminEnfermedades from "./AdminEnfermedades";

const TABS = [
  { key: "especialidades", label: "Especialidades", icon: Heart, Component: AdminSpecialties },
  { key: "subespecialidades", label: "Subespecialidades", icon: GraduationCap, Component: AdminSubespecialidades },
  { key: "enfermedades", label: "Enfermedades", icon: ListChecks, Component: AdminEnfermedades },
];

// Cascarón que junta los 3 bancos de taxonomía médica (antes 3 enlaces
// sueltos en el menú: Especialidades, Subespecialidades, Enfermedades) en
// una sola pantalla con pestañas -- tiene sentido ahora que las tres ya
// comparten casi todo su código (useTaxonomyBank y compañía, ver CLAUDE.md
// §11). Cada pestaña sigue siendo la pantalla de siempre, sin tocarla; esto
// solo decide cuál mostrar según la URL (/admin/catalogo-medico/:tab), para
// que cada una siga siendo un enlace directo (favoritos, "atrás" del
// navegador) en vez de un estado que se pierde al recargar.
export default function AdminCatalogoMedico() {
  const { tab } = useParams();
  const navigate = useNavigate();
  const current = TABS.find((t) => t.key === tab);

  if (!current) return <Navigate to="/admin/catalogo-medico/especialidades" replace />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading font-bold text-2xl text-foreground">Catálogo médico</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Los tres bancos de los que se arma la búsqueda del sitio: especialidades, subespecialidades y enfermedades.
        </p>
      </div>

      <div className="flex gap-1 bg-muted rounded-2xl p-1 w-full overflow-x-auto sm:w-fit" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => navigate(`/admin/catalogo-medico/${t.key}`)}
            className={`flex-shrink-0 flex items-center justify-center gap-1.5 px-3 sm:px-4 min-h-[40px] rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
              tab === t.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      <current.Component />
    </div>
  );
}
