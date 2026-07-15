import { CheckCircle2, Star, Globe } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

// Este componente ahora SOLO se renderiza para administradores.
// El control de "active" (perfil visible al público) es exclusivo de admin,
// ya que es lo que realmente controla la visibilidad del perfil en el sitio.
export default function DoctorEditorSidebar({ form, update, onSaveDraft, saving }) {
  const completitud = form.completeness_score || 0;

  return (
    <div className="space-y-4 xl:sticky xl:top-4">
      <div className="bg-card rounded-2xl border border-border/50 p-4 space-y-4">
        <h3 className="font-heading font-semibold text-sm">Publicación (solo admin)</h3>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Globe className="w-4 h-4 text-blue-500" />
            Perfil activo (visible al público)
          </div>
          <Switch checked={!!form.active} onCheckedChange={(v) => update("active", v)} />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Star className="w-4 h-4 text-amber-400" />
            Perfil destacado
          </div>
          <Switch checked={!!form.featured} onCheckedChange={(v) => update("featured", v)} />
        </div>

        <Button variant="outline" size="sm" onClick={onSaveDraft} disabled={saving} className="w-full rounded-xl">
          Guardar borrador
        </Button>

        <div className="space-y-1.5 pt-1 border-t border-border/40">
          <div className="flex justify-between text-xs">
            <span className="font-medium text-muted-foreground">Completitud del perfil</span>
            <span className={`font-semibold ${completitud >= 80 ? "text-green-600" : completitud >= 50 ? "text-amber-600" : "text-red-500"}`}>{completitud}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${completitud >= 80 ? "bg-green-500" : completitud >= 50 ? "bg-amber-400" : "bg-red-400"}`}
              style={{ width: `${completitud}%` }}
            />
          </div>
          {completitud >= 80 && (
            <p className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Perfil completo
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
