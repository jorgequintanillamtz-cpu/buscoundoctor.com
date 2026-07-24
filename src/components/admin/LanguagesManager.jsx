import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Languages, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const LEVELS = [
  { value: "basico", label: "Básico" },
  { value: "intermedio", label: "Intermedio" },
  { value: "avanzado", label: "Avanzado" },
  { value: "nativo", label: "Nativo" },
];

export default function LanguagesManager({ specialistId }) {
  const [languages, setLanguages] = useState([]);
  const [linked, setLinked] = useState([]); // [{ id, language_id, level }]
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customName, setCustomName] = useState("");

  const load = useCallback(async () => {
    if (!specialistId) { setLoading(false); return; }
    setLoading(true);
    try {
      const [langList, linkList] = await Promise.all([
        base44.entities.Language.list(),
        base44.entities.SpecialistLanguage.filter({ specialist_id: specialistId }),
      ]);
      setLanguages([...langList].sort((a, b) => a.name.localeCompare(b.name, "es")));
      setLinked(linkList);
    } catch {
      toast.error("Error al cargar idiomas");
    }
    setLoading(false);
  }, [specialistId]);

  useEffect(() => { load(); }, [load]);

  const getLink = (languageId) => linked.find((l) => l.language_id === languageId);

  const toggle = async (languageId) => {
    setSaving(true);
    try {
      const existing = getLink(languageId);
      if (existing) {
        await base44.entities.SpecialistLanguage.delete(existing.id);
      } else {
        await base44.entities.SpecialistLanguage.create({ specialist_id: specialistId, language_id: languageId, level: "avanzado" });
      }
      await load();
    } catch (e) {
      toast.error("Error al actualizar: " + e.message);
    }
    setSaving(false);
  };

  const changeLevel = async (languageId, level) => {
    const existing = getLink(languageId);
    if (!existing) return;
    setSaving(true);
    try {
      await base44.entities.SpecialistLanguage.update(existing.id, { level });
      await load();
    } catch (e) {
      toast.error("Error al actualizar nivel: " + e.message);
    }
    setSaving(false);
  };

  const addCustomLanguage = async () => {
    const name = customName.trim();
    if (!name) return;
    setSaving(true);
    try {
      // Si ya existe un idioma con ese nombre (sin importar mayúsculas), lo reutilizamos.
      let lang = languages.find((l) => l.name.toLowerCase() === name.toLowerCase());
      if (!lang) {
        const isoGuess = name.replace(/[^a-zA-Z]/g, "").slice(0, 2).toLowerCase().padEnd(2, "x");
        lang = await base44.entities.Language.create({ name, iso_code: isoGuess });
      }
      const existingLink = linked.find((l) => l.language_id === lang.id);
      if (!existingLink) {
        await base44.entities.SpecialistLanguage.create({ specialist_id: specialistId, language_id: lang.id, level: "avanzado" });
      }
      setCustomName("");
      await load();
      toast.success(`"${name}" agregado`);
    } catch (e) {
      toast.error("Error al agregar idioma: " + e.message);
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
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {languages.map((lang) => {
              const link = getLink(lang.id);
              const checked = !!link;
              return (
                <div key={lang.id} className={`flex items-center justify-between gap-2 border rounded-xl px-3 py-2 transition-colors ${checked ? "border-primary/40 bg-accent/20" : "border-border/50 hover:bg-accent/10"}`}>
                  <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(lang.id)}
                      disabled={saving}
                      className="w-4 h-4 rounded border-input accent-primary flex-shrink-0"
                    />
                    <span className="text-sm text-foreground truncate">{lang.name}</span>
                  </label>
                  {checked && (
                    <select
                      value={link.level || "avanzado"}
                      onChange={(e) => changeLevel(lang.id, e.target.value)}
                      disabled={saving}
                      className="text-xs bg-background border border-input rounded-lg px-1.5 py-1 flex-shrink-0"
                    >
                      {LEVELS.map((l) => (
                        <option key={l.value} value={l.value}>{l.label}</option>
                      ))}
                    </select>
                  )}
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-border/40">
            <label className="text-xs font-medium mb-1.5 block">¿No encuentras tu idioma? Escríbelo aquí</label>
            <div className="flex gap-2">
              <Input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Ej: Mandarín, Coreano, Náhuatl..."
                className="rounded-xl text-sm h-9"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomLanguage())}
              />
              <Button type="button" variant="outline" size="sm" className="rounded-xl h-9 px-3 flex-shrink-0" onClick={addCustomLanguage} disabled={saving || !customName.trim()}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
