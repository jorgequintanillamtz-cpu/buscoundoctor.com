import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { byPosition } from "@/lib/storefrontUtils";

/**
 * Editor reutilizable para listas simples (condiciones, seguros).
 * props:
 * - storefrontId
 * - entityName: nombre de la entidad en base44.entities
 * - field: campo de texto ("text" o "name")
 * - label: título de la sección
 * - placeholder
 */
export default function SimpleListEditor({
  storefrontId,
  entityName,
  field,
  label,
  placeholder,
  items,
  setItems,
}) {
  const [newVal, setNewVal] = useState("");

  const reload = async () => {
    const data = await base44.entities[entityName].filter({ storefront_id: storefrontId });
    setItems(data.sort(byPosition));
  };

  const add = async () => {
    if (!newVal.trim()) return;
    await base44.entities[entityName].create({
      storefront_id: storefrontId,
      [field]: newVal.trim(),
      position: items.length,
    });
    setNewVal("");
    reload();
  };

  const remove = async (id) => {
    await base44.entities[entityName].delete(id);
    reload();
  };

  const move = async (index, dir) => {
    const swapIndex = index + dir;
    if (swapIndex < 0 || swapIndex >= items.length) return;
    const a = items[index];
    const b = items[swapIndex];
    await base44.entities[entityName].bulkUpdate([
      { id: a.id, position: b.position ?? swapIndex },
      { id: b.id, position: a.position ?? index },
    ]);
    reload();
  };

  return (
    <div>
      <h3 className="font-heading font-semibold text-sm text-foreground mb-3">{label}</h3>
      <div className="flex gap-2 mb-3">
        <Input
          value={newVal}
          onChange={(e) => setNewVal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder={placeholder}
        />
        <Button type="button" size="icon" onClick={add} className="flex-shrink-0">
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      <ul className="space-y-1.5">
        {items.map((item, idx) => (
          <li
            key={item.id}
            className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2"
          >
            <span className="flex-1 text-sm text-foreground">{item[field]}</span>
            <button
              type="button"
              onClick={() => move(idx, -1)}
              disabled={idx === 0}
              className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => move(idx, 1)}
              disabled={idx === items.length - 1}
              className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => remove(item.id)}
              className="p-1 text-destructive hover:text-destructive/80"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </li>
        ))}
      </ul>
      {items.length === 0 && (
        <p className="text-xs text-muted-foreground">Aún no has agregado elementos.</p>
      )}
    </div>
  );
}