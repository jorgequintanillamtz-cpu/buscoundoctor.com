import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import {
  Upload, X, Image as ImageIcon, Share2, Loader2, Search,
  Brain, Smile, Heart, Baby, Stethoscope, Sparkles, Bone, Eye, Ear,
  Droplet, Activity, Scissors, Pill, Wind, Dumbbell, Syringe, Microscope, Users, Utensils,
} from "lucide-react";

// Mismo set de íconos disponibles que usa SpecialtyCard.jsx para renderizar
// las especialidades en el sitio — si se agrega uno nuevo ahí, agregarlo aquí también.
const ICONS = {
  Brain, Smile, Heart, Baby, Stethoscope, Sparkles, Bone, Eye, Ear,
  Droplet, Activity, Scissors, Pill, Wind, Dumbbell, Syringe, Microscope, Users, Utensils,
};
const ICON_NAMES = Object.keys(ICONS);

export default function AdminSiteImages() {
  const [settings, setSettings] = useState(null);
  const [settingsId, setSettingsId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingOg, setUploadingOg] = useState(false);

  const [specialties, setSpecialties] = useState([]);
  const [specialtySearch, setSpecialtySearch] = useState("");
  const [pickerOpenFor, setPickerOpenFor] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.SiteSettings.list().catch(() => []),
      base44.entities.Specialty.list("name").catch(() => []),
    ]).then(([settingsList, specialtyList]) => {
      if (settingsList.length > 0) {
        setSettings(settingsList[0]);
        setSettingsId(settingsList[0].id);
      } else {
        setSettings({ hero_image_url: "", og_image_url: "" });
      }
      setSpecialties(specialtyList);
      setLoading(false);
    });
  }, []);

  const saveSettings = async (patch) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    try {
      if (settingsId) {
        await base44.entities.SiteSettings.update(settingsId, patch);
      } else {
        const created = await base44.entities.SiteSettings.create(next);
        setSettingsId(created.id);
      }
      toast.success("Guardado");
    } catch (e) {
      toast.error("No se pudo guardar: " + e.message);
    }
  };

  const uploadHero = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingHero(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await saveSettings({ hero_image_url: file_url });
    } catch { toast.error("Error al subir la imagen"); }
    setUploadingHero(false);
    e.target.value = "";
  };

  const uploadOg = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingOg(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await saveSettings({ og_image_url: file_url });
    } catch { toast.error("Error al subir la imagen"); }
    setUploadingOg(false);
    e.target.value = "";
  };

  const changeSpecialtyIcon = async (specialty, iconName) => {
    setSpecialties((prev) => prev.map((s) => (s.id === specialty.id ? { ...s, icon: iconName } : s)));
    setPickerOpenFor(null);
    try {
      await base44.entities.Specialty.update(specialty.id, { icon: iconName });
      toast.success(`Ícono de "${specialty.name}" actualizado`);
    } catch (e) {
      toast.error("No se pudo guardar: " + e.message);
    }
  };

  const filteredSpecialties = useMemo(() => {
    const q = specialtySearch.trim().toLowerCase();
    if (!q) return specialties;
    return specialties.filter((s) => s.name.toLowerCase().includes(q));
  }, [specialties, specialtySearch]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="font-heading font-bold text-2xl text-foreground">Imágenes del sitio</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Administra las imágenes generales de la página, sin necesidad de tocar código.
        </p>
      </div>

      {/* Imagen principal del Hero */}
      <section className="bg-card rounded-2xl border border-border/50 p-5 sm:p-6 mb-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-brand-bluePale flex items-center justify-center flex-shrink-0">
            <ImageIcon className="w-5 h-5 text-brand-blue" />
          </div>
          <div>
            <h2 className="font-heading font-semibold text-foreground">Imagen principal (portada del Home)</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Se muestra del lado derecho del encabezado en la página de inicio. Si no subes ninguna, se usa la ilustración por defecto.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="w-full sm:w-56 h-48 rounded-xl border border-border/50 bg-muted/40 overflow-hidden flex items-center justify-center flex-shrink-0">
            {settings.hero_image_url ? (
              <img src={settings.hero_image_url} alt="Imagen principal del Home" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs text-muted-foreground text-center px-4">Usando la ilustración por defecto</span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border/60 text-sm font-medium cursor-pointer hover:bg-muted transition-colors w-fit">
              {uploadingHero ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {settings.hero_image_url ? "Cambiar imagen" : "Subir imagen"}
              <input type="file" accept="image/*" className="hidden" onChange={uploadHero} disabled={uploadingHero} />
            </label>
            {settings.hero_image_url && (
              <button
                onClick={() => saveSettings({ hero_image_url: "" })}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors w-fit"
              >
                <X className="w-4 h-4" />
                Quitar y usar ilustración por defecto
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Imagen Open Graph */}
      <section className="bg-card rounded-2xl border border-border/50 p-5 sm:p-6 mb-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-brand-bluePale flex items-center justify-center flex-shrink-0">
            <Share2 className="w-5 h-5 text-brand-blue" />
          </div>
          <div>
            <h2 className="font-heading font-semibold text-foreground">Imagen para compartir en redes sociales</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Es la miniatura que aparece cuando alguien comparte el link del sitio en WhatsApp, Facebook o X. Tamaño recomendado: 1200×630px.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="w-full sm:w-56 aspect-[1200/630] rounded-xl border border-border/50 bg-muted/40 overflow-hidden flex items-center justify-center flex-shrink-0">
            {settings.og_image_url ? (
              <img src={settings.og_image_url} alt="Imagen para redes sociales" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs text-muted-foreground text-center px-4">Usando la imagen por defecto</span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border/60 text-sm font-medium cursor-pointer hover:bg-muted transition-colors w-fit">
              {uploadingOg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {settings.og_image_url ? "Cambiar imagen" : "Subir imagen"}
              <input type="file" accept="image/*" className="hidden" onChange={uploadOg} disabled={uploadingOg} />
            </label>
            {settings.og_image_url && (
              <button
                onClick={() => saveSettings({ og_image_url: "" })}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors w-fit"
              >
                <X className="w-4 h-4" />
                Quitar y usar la imagen por defecto
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Íconos de especialidades */}
      <section className="bg-card rounded-2xl border border-border/50 p-5 sm:p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-brand-bluePale flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-brand-blue" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-heading font-semibold text-foreground">Íconos de especialidades</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Son los íconos circulares que se ven en "Especialidades más buscadas" en la página de inicio y en el buscador. Haz clic en cualquiera para cambiarlo.
            </p>
          </div>
        </div>

        <div className="relative mb-4">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={specialtySearch}
            onChange={(e) => setSpecialtySearch(e.target.value)}
            placeholder="Buscar especialidad..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-border/60 text-sm outline-none focus:border-brand-blue"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[520px] overflow-y-auto pr-1">
          {filteredSpecialties.map((s) => {
            const CurrentIcon = ICONS[s.icon] || Heart;
            const isOpen = pickerOpenFor === s.id;
            return (
              <div key={s.id} className="relative">
                <button
                  onClick={() => setPickerOpenFor(isOpen ? null : s.id)}
                  className="w-full flex items-center gap-2.5 p-3 rounded-xl border border-border/50 hover:border-brand-blue/40 hover:bg-brand-bluePale/30 transition-colors text-left"
                >
                  <span className="w-9 h-9 rounded-full bg-brand-bluePale flex items-center justify-center flex-shrink-0">
                    <CurrentIcon className="w-4 h-4 text-brand-blue" />
                  </span>
                  <span className="text-xs font-medium text-foreground truncate">{s.name}</span>
                </button>

                {isOpen && (
                  <div className="absolute z-20 top-full mt-1 left-0 w-64 bg-white rounded-2xl border border-border/50 shadow-xl p-3">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">
                      Elegir ícono para "{s.name}"
                    </p>
                    <div className="grid grid-cols-5 gap-1.5">
                      {ICON_NAMES.map((name) => {
                        const OptionIcon = ICONS[name];
                        const active = (s.icon || "Heart") === name;
                        return (
                          <button
                            key={name}
                            title={name}
                            onClick={() => changeSpecialtyIcon(s, name)}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                              active ? "bg-brand-blue text-white" : "bg-muted text-muted-foreground hover:bg-brand-bluePale hover:text-brand-blue"
                            }`}
                          >
                            <OptionIcon className="w-4 h-4" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {filteredSpecialties.length === 0 && (
            <p className="col-span-full text-sm text-muted-foreground text-center py-8">Sin resultados.</p>
          )}
        </div>
      </section>
    </div>
  );
}
