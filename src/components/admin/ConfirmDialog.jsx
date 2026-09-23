import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Va de la mano con useConfirmDialog(): un solo AlertDialog reusable para
// todas las confirmaciones de "¿seguro?" del admin (borrar, desactivar...),
// en vez del cuadro gris del navegador. `destructive` (default true) pinta
// el botón de confirmar en rojo; pásalo en false para una confirmación que
// no borra nada.
export default function ConfirmDialog({ state, onConfirm, onCancel }) {
  return (
    <AlertDialog open={!!state} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{state?.title || "¿Estás seguro?"}</AlertDialogTitle>
          <AlertDialogDescription>{state?.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="rounded-xl" onClick={onCancel}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className={`rounded-xl ${state?.destructive === false ? "" : "bg-destructive hover:bg-destructive/90"}`}
            onClick={onConfirm}
          >
            {state?.confirmLabel || "Sí, continuar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
