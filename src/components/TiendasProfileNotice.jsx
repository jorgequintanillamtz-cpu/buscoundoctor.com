import { useNavigate } from "react-router-dom";
import { LogOut, ExternalLink } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";

// Dirección del panel del sitio de tiendas, para el botón "Ir a mi panel".
// Vacía por defecto: sin ella no se muestra el botón (solo el aviso).
const TIENDAS_ORIGIN = (() => {
  const raw = (import.meta.env.VITE_TIENDAS_ORIGIN || "").trim();
  return /^https?:\/\//i.test(raw) ? raw.replace(/\/+$/, "") : "";
})();

// Aviso para un perfil creado desde el sitio de tiendas (specialist.origin =
// 'tiendas', ver specialistOrigin.js): ese perfil no se administra desde el
// panel del directorio. Solo lee y muestra; no escribe nada al abrirse.
export function TiendasProfileNotice() {
  const navigate = useNavigate();
  return (
    <div className="max-w-md mx-auto text-center py-16">
      <h1 className="font-heading font-bold text-xl text-foreground">Tu perfil es del sitio de tiendas</h1>
      <p className="text-sm text-muted-foreground mt-2">
        Este perfil se creó desde el sitio de tiendas y se administra desde allá. No aparece en el directorio de BuscoUnDoctor.
      </p>
      <div className="mt-5 flex flex-col sm:flex-row gap-2 justify-center">
        {TIENDAS_ORIGIN && (
          <Button asChild className="rounded-xl gap-1.5">
            <a href={TIENDAS_ORIGIN}>
              Ir a mi panel
              <ExternalLink className="w-4 h-4" />
            </a>
          </Button>
        )}
        <Button
          variant="outline"
          className="rounded-xl gap-1.5"
          onClick={() => base44.auth.logout(false).then(() => navigate("/"))}
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </Button>
      </div>
    </div>
  );
}
