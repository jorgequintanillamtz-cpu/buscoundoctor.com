import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Languages } from "lucide-react";
import { toast } from "sonner";

export default function LanguagesManager({ specialistId }) {
  const [languages, setLanguages] = useState([]);
  const [linked, setLinked] = useState([]); // [{ id, language_id }]
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!specialistId) { setLoading(false); return; }
    setLoading(true);
    try {
      const [langList, linkList] = await Promise.all([
        base44.entities.Language.list("name", 50),
        base44.entities.SpecialistLanguage.filter({ specialist_id: specialistId }),
      ]);
      setLanguages(langList);
      setLinked(linkList);
    } catch {
      toast.error("Error al cargar idiomas");
    }
    setLoading(false);
  }, [specialistId]);

  useEffect(() => { load(); }, [load]);

  const isChecked = (languageId) => linked.some((l) => l.language_id === languageId);

  const toggle = async (languageId) => {
    setSaving(true);
    try {
      const existing = linked.find((l) => l.language_id === languageId);
      if (existing) {
        await base44.entities.SpecialistLanguage.delete(existing.id);
      } else {
        await base44.entities.SpecialistLanguage.create({ specialist_id: specialistId, language_id: languageId });
      }
      await load();
    } catch (e) {
      toast.error("Error al actualizar: " + e.message);
    }
    setSaving(false);
  };

  return (
    <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Languages className="w-4 h-4 text-primary" />
        <h2 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-wide">Idiomas que hablas</h2>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : languages.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">No hay idiomas en el catálogo todavía.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {languages.map((lang) => (
            <label key={lang.id} className="flex items-center gap-2 cursor-pointer border border-border/50 rounded-xl px-3 py-2 hover:bg-accent/30 transition-colors">
              <input
                type="checkbox"
                checked={isChecked(lang.id)}
                onChange={() => toggle(lang.id)}
                disabled={saving}
                className="w-4 h-4 rounded border-input accent-primary"
              />
              <span className="text-sm text-foreground">{lang.name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
