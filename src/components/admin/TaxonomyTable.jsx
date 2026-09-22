import { Pencil, Trash2 } from "lucide-react";

// Tabla genérica de los bancos de taxonomía: cada pantalla solo dice cuáles
// columnas quiere y cómo dibujar cada celda (`columns`), el resto (fila,
// hover, botones de editar/borrar, estado vacío) es idéntico en las tres.
export default function TaxonomyTable({ items, columns, onEdit, onDelete, emptyIcon: EmptyIcon, emptyLabel = "Sin resultados" }) {
  if (items.length === 0) {
    return (
      <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
        <div className="text-center py-20">
          {EmptyIcon && <EmptyIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />}
          <p className="text-muted-foreground font-medium">{emptyLabel}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 border-b border-border/50">
            <tr>
              {columns.map((col, i) => (
                <th
                  key={col.key}
                  className={`${i === 0 ? "px-5" : "px-4"} py-3 font-medium text-muted-foreground ${col.align === "right" ? "text-right" : "text-left"}`}
                >
                  {col.header}
                </th>
              ))}
              <th className="text-right px-5 py-3 font-medium text-muted-foreground">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                {columns.map((col, i) => (
                  <td key={col.key} className={`${i === 0 ? "px-5" : "px-4"} py-3 ${col.align === "right" ? "text-right" : ""} ${i === 0 ? "font-medium text-foreground" : ""}`}>
                    {col.render(item)}
                  </td>
                ))}
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => onEdit(item)} aria-label="Editar" className="p-1.5 rounded-lg hover:bg-muted">
                      <Pencil className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button onClick={() => onDelete(item)} aria-label="Eliminar" className="p-1.5 rounded-lg hover:bg-destructive/10">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
