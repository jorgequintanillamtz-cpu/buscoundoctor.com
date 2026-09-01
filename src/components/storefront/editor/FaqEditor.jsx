import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, ArrowUp, ArrowDown, Pencil, Check, X } from "lucide-react";
import { byPosition } from "@/lib/storefrontUtils";

const MAX_FAQS = 5;

export default function FaqEditor({ storefrontId, items, setItems }) {
  const [newQ, setNewQ] = useState("");
  const [newA, setNewA] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editQ, setEditQ] = useState("");
  const [editA, setEditA] = useState("");

  const atLimit = items.length >= MAX_FAQS;

  const reload = async () => {
    const data = await base44.entities.StorefrontFAQ.filter({ storefront_id: storefrontId });
    setItems(data.sort(byPosition));
  };

  const add = async () => {
    if (atLimit) return;
    if (!newQ.trim() || !newA.trim()) return;
    await base44.entities.StorefrontFAQ.create({
      storefront_id: storefrontId,
      question: newQ.trim(),
      answer: newA.trim(),
      position: items.length,
    });
    setNewQ("");
    setNewA("");
    reload();
  };

  const remove = async (id) => {
    await base44.entities.StorefrontFAQ.delete(id);
    reload();
  };

  const move = async (index, dir) => {
    const swapIndex = index + dir;
    if (swapIndex < 0 || swapIndex >= items.length) return;
    const a = items[index];
    const b = items[swapIndex];
    await base44.entities.StorefrontFAQ.bulkUpdate([
      { id: a.id, position: b.position ?? swapIndex },
      { id: b.id, position: a.position ?? index },
    ]);
    reload();
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditQ(item.question);
    setEditA(item.answer);
  };

  const saveEdit = async (id) => {
    await base44.entities.StorefrontFAQ.update(id, {
      question: editQ.trim(),
      answer: editA.trim(),
    });
    setEditingId(null);
    reload();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-heading font-semibold text-sm text-foreground">Preguntas frecuentes</h3>
        <span className={`text-xs font-medium ${atLimit ? "text-amber-600" : "text-muted-foreground"}`}>
          {items.length}/{MAX_FAQS}
        </span>
      </div>

      {/* Agregar nuevo */}
      {!atLimit && (
        <div className="space-y-2 mb-3 p-3 bg-muted/30 rounded-lg">
          <Input
            value={newQ}
            onChange={(e) => setNewQ(e.target.value)}
            placeholder="Pregunta"
          />
          <Textarea
            value={newA}
            onChange={(e) => setNewA(e.target.value)}
            placeholder="Respuesta"
            rows={2}
          />
          <Button type="button" size="sm" onClick={add} disabled={!newQ.trim() || !newA.trim()}>
            <Plus className="w-4 h-4" />
            Agregar
          </Button>
        </div>
      )}

      <ul className="space-y-1.5">
        {items.map((item, idx) => (
          <li key={item.id} className="bg-muted/40 rounded-lg px-3 py-2">
            {editingId === item.id ? (
              <div className="space-y-2">
                <Input value={editQ} onChange={(e) => setEditQ(e.target.value)} className="h-8" />
                <Textarea value={editA} onChange={(e) => setEditA(e.target.value)} rows={2} />
                <div className="flex gap-2">
                  <button type="button" onClick={() => saveEdit(item.id)} className="p-1 text-emerald-600">
                    <Check className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => setEditingId(null)} className="p-1 text-muted-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{item.question}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{item.answer}</p>
                </div>
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
      {atLimit && (
        <p className="text-xs text-amber-600 mt-2">
          Alcanzaste el máximo de {MAX_FAQS} preguntas. Elimina una para agregar otra.
        </p>
      )}
    </div>
  );
}