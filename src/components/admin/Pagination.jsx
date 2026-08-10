import { ChevronLeft, ChevronRight } from "lucide-react";

// Control de paginación compartido por los listados del admin. No se
// muestra si todo cabe en una sola página.
export default function Pagination({ page, totalPages, onPageChange, total, pageSize }) {
  if (totalPages <= 1) return null;
  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between gap-3 flex-wrap pt-4">
      <p className="text-xs text-muted-foreground">
        Mostrando {startItem}–{endItem} de {total}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="h-8 w-8 rounded-lg border border-input flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:pointer-events-none transition-colors"
          aria-label="Página anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-medium text-foreground px-1 whitespace-nowrap">
          Página {page} de {totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="h-8 w-8 rounded-lg border border-input flex items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:pointer-events-none transition-colors"
          aria-label="Página siguiente"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
