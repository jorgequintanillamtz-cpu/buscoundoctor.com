import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Pencil, Trash2, Stethoscope, Upload, Loader2, Shield, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

const EMPTY_INSURER = { name: "", logo_url: "", is_active: true };
const EMPTY_LANGUAGE = { name: "", iso_code: "" };

// Catálogo de Aseguradoras e Idiomas: hoy los doctores crean estos registros
// "al vuelo" al escribir un nombre que no existe en su perfil (ver
// InsurersManager.jsx / LanguagesManager.jsx), lo que genera duplicados y no
// deja subir logos. Esta página es el lugar único para mantenerlos limpios.
export default function AdminCatalogos() {
  const { confirm, dialogProps } = useConfirmDialog();
  const [tab, setTab] = useState("aseguradoras");
  const [insurers, setInsurers] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [insurerForm, setInsurerForm] = useState(EMPTY_INSURER);
  const [languageForm, setLanguageForm] = useState(EMPTY_LANGUAGE);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [ins, langs] = await Promise.all([
      base44.entities.Insurer.list("name", 200),
      base44.entities.Language.list("name", 200),
    ]);
    setInsurers(ins);
    setLanguages(langs);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setInsurerForm(EMPTY_INSURER);
    setLanguageForm(EMPTY_LANGUAGE);
    setDialogOpen(true);
  };

  const openEditInsurer = (item) => {
    setEditing(item);
    setInsurerForm({ name: item.name, logo_url: item.logo_url || "", is_active: item.is_active !== false });
    setDialogOpen(true);
  };

  const openEditLanguage = (item) => {
    setEditing(item);
    setLanguageForm({ name: item.name, iso_code: item.iso_code || "" });
    setDialogOpen(true);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file, bucket: "site-assets" });
      setInsurerForm((prev) => ({ ...prev, logo_url: file_url }));
    } catch (err) {
      toast.error("Error al subir el logo: " + err.message);
    }
    setUploadingLogo(false);
  };

  const handleSaveInsurer = async () => {
    if (!insurerForm.name.trim()) { toast.error("El nombre es obligatorio"); return; }
    setSaving(true);
    try {
      if (editing) {
        await base44.entities.Insurer.update(editing.id, insurerForm);
        toast.success("Aseguradora actualizada");
      } else {
        await base44.entities.Insurer.create(insurerForm);
        toast.success("Aseguradora creada");
      }
      setDialogOpen(false);
      load();
    } catch (err) {
      toast.error("Error: " + err.message);
    }
    setSaving(false);
  };

  const handleSaveLanguage = async () => {
    if (!languageForm.name.trim()) { toast.error("El nombre es obligatorio"); return; }
    if (languageForm.iso_code.trim().length !== 2) { toast.error("El código ISO debe tener 2 letras (ej: es, en)"); return; }
    setSaving(true);
    try {
      const payload = { name: languageForm.name.trim(), iso_code: languageForm.iso_code.trim().toLowerCase() };
      if (editing) {
        await base44.entities.Language.update(editing.id, payload);
        toast.success("Idioma actualizado");
      } else {
        await base44.entities.Language.create(payload);
        toast.success("Idioma creado");
      }
      setDialogOpen(false);
      load();
    } catch (err) {
      toast.error("Error: " + err.message);
    }
    setSaving(false);
  };

  const handleDeleteInsurer = async (id) => {
    const ok = await confirm({
      title: "¿Eliminar esta aseguradora?",
      description: "Los doctores que la tenían seleccionada la perderán de su perfil.",
      confirmLabel: "Eliminar",
    });
    if (!ok) return;
    await base44.entities.Insurer.delete(id);
    toast.success("Aseguradora eliminada");
    load();
  };

  const handleDeleteLanguage = async (id) => {
    const ok = await confirm({
      title: "¿Eliminar este idioma?",
      description: "Los doctores que lo tenían seleccionado lo perderán de su perfil.",
      confirmLabel: "Eliminar",
    });
    if (!ok) return;
    await base44.entities.Language.delete(id);
    toast.success("Idioma eliminado");
    load();
  };

  const toggleInsurerActive = async (item) => {
    const next = item.is_active === false;
    setInsurers((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_active: next } : i)));
    try {
      await base44.entities.Insurer.update(item.id, { is_active: next });
    } catch (err) {
      setInsurers((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_active: !next } : i)));
      toast.error("No se pudo actualizar: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Stethoscope className="w-12 h-12 text-primary animate-bounce" strokeWidth={1.75} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="font-heading font-bold text-2xl text-foreground">Catálogos</h1>
        <Button className="gap-2 rounded-xl" onClick={openCreate}>
          <Plus className="w-4 h-4" /> Agregar {tab === "aseguradoras" ? "aseguradora" : "idioma"}
        </Button>
      </div>

      <div className="inline-flex items-center bg-muted rounded-full p-1 mb-6">
        <button
          type="button"
          onClick={() => setTab("aseguradoras")}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            tab === "aseguradoras" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
          }`}
        >
          <Shield className="w-3.5 h-3.5" /> Aseguradoras ({insurers.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("idiomas")}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            tab === "idiomas" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
          }`}
        >
          <Languages className="w-3.5 h-3.5" /> Idiomas ({languages.length})
        </button>
      </div>

      {tab === "aseguradoras" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {insurers.map((item) => (
            <div key={item.id} className="bg-card rounded-2xl border border-border/50 p-5 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {item.logo_url ? (
                    <img src={item.logo_url} alt="" className="w-full h-full object-contain p-1" />
                  ) : (
                    <Shield className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-heading font-semibold text-foreground truncate">{item.name}</h3>
                  <button
                    type="button"
                    onClick={() => toggleInsurerActive(item)}
                    className="flex items-center gap-1.5 mt-1"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${item.is_active !== false ? "bg-green-500" : "bg-red-400"}`} />
                    <span className="text-xs text-muted-foreground">{item.is_active !== false ? "Activa" : "Inactiva"}</span>
                  </button>
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => openEditInsurer(item)} aria-label="Editar aseguradora" className="p-1.5 rounded-lg hover:bg-muted">
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button onClick={() => handleDeleteInsurer(item.id)} aria-label="Eliminar aseguradora" className="p-1.5 rounded-lg hover:bg-destructive/10">
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {languages.map((item) => (
            <div key={item.id} className="bg-card rounded-2xl border border-border/50 p-5 flex items-start justify-between">
              <div>
                <h3 className="font-heading font-semibold text-foreground">{item.name}</h3>
                <p className="text-xs text-muted-foreground mt-1 uppercase">{item.iso_code}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEditLanguage(item)} aria-label="Editar idioma" className="p-1.5 rounded-lg hover:bg-muted">
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button onClick={() => handleDeleteLanguage(item.id)} aria-label="Eliminar idioma" className="p-1.5 rounded-lg hover:bg-destructive/10">
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          {tab === "aseguradoras" ? (
            <>
              <DialogHeader>
                <DialogTitle className="font-heading">{editing ? "Editar" : "Nueva"} aseguradora</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Nombre *</label>
                  <Input
                    value={insurerForm.name}
                    onChange={(e) => setInsurerForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Logo</label>
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {insurerForm.logo_url ? (
                        <img src={insurerForm.logo_url} alt="" className="w-full h-full object-contain p-1" />
                      ) : (
                        <Shield className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                    <label className="flex items-center justify-center gap-2 h-10 px-4 rounded-xl border border-dashed border-border text-sm text-muted-foreground cursor-pointer hover:bg-accent/30 transition-colors">
                      {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {uploadingLogo ? "Subiendo..." : "Subir logo"}
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
                    </label>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={insurerForm.is_active}
                    onCheckedChange={(v) => setInsurerForm((prev) => ({ ...prev, is_active: v }))}
                  />
                  <span className="text-sm">Activa (visible en el sitio)</span>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">Cancelar</Button>
                  <Button onClick={handleSaveInsurer} disabled={saving} className="rounded-xl">
                    {saving && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
                    {editing ? "Guardar" : "Crear"}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="font-heading">{editing ? "Editar" : "Nuevo"} idioma</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Nombre *</label>
                  <Input
                    value={languageForm.name}
                    onChange={(e) => setLanguageForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Ej: Español"
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Código ISO (2 letras) *</label>
                  <Input
                    value={languageForm.iso_code}
                    onChange={(e) => setLanguageForm((prev) => ({ ...prev, iso_code: e.target.value }))}
                    placeholder="Ej: es"
                    maxLength={2}
                    className="rounded-xl"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">Cancelar</Button>
                  <Button onClick={handleSaveLanguage} disabled={saving} className="rounded-xl">
                    {saving && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
                    {editing ? "Guardar" : "Crear"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      <ConfirmDialog {...dialogProps} />
    </div>
  );
}
