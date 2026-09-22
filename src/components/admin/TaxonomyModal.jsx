import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// El "cascarón" de crear/editar que comparten los bancos de taxonomía
// (Especialidades, Subespecialidades, Enfermedades): antes cada pantalla
// dibujaba su propia ventana emergente a mano (un <div className="fixed
// inset-0 bg-black/40">...) en vez de usar el mismo Dialog que ya usan
// Catálogos y Ciudades. Los campos de adentro siguen siendo de cada
// pantalla (son genuinamente distintos: Enfermedades tiene 11 campos y
// Especialidades solo 4), este componente solo pone el título, el marco y
// los botones de Cancelar/Guardar.
export default function TaxonomyModal({ open, onOpenChange, title, onSave, saving, children }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">{children}</div>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">Cancelar</Button>
          <Button onClick={onSave} disabled={saving} className="rounded-xl">
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
