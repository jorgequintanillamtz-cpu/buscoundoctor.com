import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ArrowUp, ArrowDown, Pencil, Check, X } from "lucide-react";
import { byPosition } from "@/lib/storefrontUtils";

export default function TimelineEditor({ storefrontId, items, setItems }) {
  const [newYear, setNewYear] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editYear, setEditYear] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const reload = async () => {
    const data = await base44.entities.StorefrontTimelineEntry.filter({ storefront_id: storefrontId });
    setItems(data.sort(byPosition));
  };

  const add = async () => {
    if (!newDesc.trim()) return;
    await base44.entities.StorefrontTimelineEntry.create({
      storefront_id: storefrontId,
      year: newYear.trim(),
      description: newDesc.trim(),
      position: items.length,
    });
    setNewYear("");
    setNewDesc("");
    reload();
  };

  const remove = async (id) => {
    await base44.entities.StorefrontTimelineEntry.delete(id);
    reload();
  };

  const move = async (index, dir) => {
    const swapIndex = index + dir;
    if (swapIndex < 0 || swapIndex >= items.length) return;
    const a = items[index];
    const b = items[swapIndex];
    await base44.entities.StorefrontTimelineEntry.bulkUpdate([
      { id: a.id, position: b.position ?? swapIndex },
      { id: b.id, position: a.position ?? index },
    ]);
    reload();
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditYear(item.year || "");
    setEditDesc(item.description);
  };

  const saveEdit = async (id) => {
    await base44.entities.StorefrontTimelineEntry.update(id, {
      year: editYear.trim(),
      description: editDesc.trim(),
    });
    setEditingId(null);
    reload();
  };

  return (
    <div>
      <h3 className="font-heading font-semibold text-sm text-foreground mb-3">Trayectoria</h3>

      {/* Agregar nuevo */}
      <div className="flex gap-2 mb-3">
        <Input
          value={newYear}
          onChange={(e) => setNewYear(e.target.value)}
          placeholder="Año"
          className="w-24 flex-shrink-0"
        />
        <Input
          value={newDesc}
          onChange={(e) => setNewDesc(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder="Ej. Especialidad en Cardiología, Hospital X"
        />
        <Button type="button" size="icon" onClick={add} className="flex-shrink-0">
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <ul className="space-y-1.5">
        {items.map((item, idx) => (
          <li key={item.id} className="bg-muted/40 rounded-lg px-3 py-2">
            {editingId === item.id ? (
              <div className="flex gap-2">
                <Input
                  value={editYear}
                  onChange={(e) => setEditYear(e.target.value)}
                  className="w-24 flex-shrink-0 h-8"
                />
                <Input
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="h-8"
                />
                <button type="button" onClick={() => saveEdit(item.id)} className="p-1 text-emerald-600">
                  <Check className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => setEditingId(null)} className="p-1 text-muted-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-blue-600 font-semibold text-xs w-12 flex-shrink-0">{item.year}</span>
                <span className="flex-1 text-sm text-foreground">{item.description}</span>
                <button type="button" onClick={() => move(idx, -1)} disabled={idx === 0} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30">
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => move(idx, 1)} disabled={idx === items.length - 1} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30">
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => startEdit(item)} className="p-1 text-muted-foreground hover:text-foreground">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => remove(item.id)} className="p-1 text-destructive hover:text-destructive/80">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
      {items.length === 0 && (
        <p className="text-xs text-muted-foreground">Aún no has agregado entradas.</p>
      )}
    </div>
  );
}