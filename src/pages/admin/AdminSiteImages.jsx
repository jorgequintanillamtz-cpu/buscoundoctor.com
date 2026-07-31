import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import {
  Upload, X, Image as ImageIcon, Share2, Loader2,
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

// Mismo orden que usa Home.jsx para elegir las "Especialidades más
// buscadas" — son las únicas 8 cuyo ícono se ve en la página de inicio, así
// que son las únicas que tiene sentido editar aquí.
const POPULAR_SPECIALTY_ORDER = [
  "Dentista", "Ginecología", "Pediatría", "Dermatología", "Psicología",
  "Nutrición", "Ortopedia y Traumatología", "Oftalmología", "Cardiología",
  "Otorrinolaringología", "Medicina General", "Urología", "Psiquiatría",
  "Gastroenterología", "Endocrinología",
];

// Tamaño fijo (en px) al que se recorta/redimensiona cada ícono subido, para
// que todos midan exactamente lo mismo sin importar la foto original.
const ICON_IMAGE_SIZE = 480;

// Recorta cualquier imagen al centro en un cuadrado 1:1, la redimensiona a un
// tamaño fijo y la convierte a WebP — así no depende de que el admin suba
// ya una imagen cuadrada o en el formato correcto, la app lo hace sola.
function cropToSquareWebp(file, size = ICON_IMAGE_SIZE, quality = 0.9) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const sx = (img.width - side) / 2;
      const sy = (img.height - side) / 2;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        if (!blob) { reject(new Error("No se pudo procesar la imagen")); return; }
        const baseName = (file.name || "icono").replace(/\.[^.]+$/, "");
        resolve(new File([blob], `${baseName}.webp`, { type: "image/webp" }));
      }, "image/webp", quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("No se pudo leer la imagen")); };
    img.src = url;
  });
}

export default function AdminSiteImages() {
  const [settings, setSettings] = useState(null);
  const [settingsId, setSettingsId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingOg, setUploadingOg] = useState(false);

  const [specialties, setSpecialties] = useState([]);
  const [pickerOpenFor, setPickerOpenFor] = useState(null);
  const [uploadingIconFor, setUploadingIconFor] = useState(null);

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
    setSpecialties((prev) => prev.map((s) => (s.id === specialty.id ? { ...s, icon: iconName, icon_image_url: "" } : s)));
    setPickerOpenFor(null);
    try {
      await base44.entities.Specialty.update(specialty.id, { icon: iconName, icon_image_url: "" });
      toast.success(`Ícono de "${specialty.name}" actualizado`);
    } catch (e) {
      toast.error("No se pudo guardar: " + e.message);
    }
  };

  const uploadSpecialtyIconImage = async (specialty, e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingIconFor(specialty.id);
    try {
      const squareWebp = await cropToSquareWebp(file);
      const { file_url } = await base44.integrations.Core.UploadFile({ file: squareWebp });
      setSpecialties((prev) => prev.map((s) => (s.id === specialty.id ? { ...s, icon_image_url: file_url } : s)));
      await base44.entities.Specialty.update(specialty.id, { icon_image_url: file_url });
      toast.success(`Imagen de "${specialty.name}" actualizada`);
      setPickerOpenFor(null);
    } catch {
      toast.error("Error al subir la imagen");
    }
    setUploadingIconFor(null);
    e.target.value = "";
  };

  const removeSpecialtyIconImage = async (specialty) => {
    setSpecialties((prev) => prev.map((s) => (s.id === specialty.id ? { ...s, icon_image_url: "" } : s)));
    try {
      await base44.entities.Specialty.update(specialty.id, { icon_image_url: "" });
      toast.success(`Se quitó la imagen de "${specialty.name}"`);
    } catch (e) {
      toast.error("No se pudo guardar: " + e.message);
    }
  };

  // Solo las 8 especialidades que realmente se muestran en "Especialidades
  // más buscadas" del Home (mismo criterio que sortByPopularity().slice(0,8)).
  const homepageSpecialties = useMemo(() => {
    return [...specialties]
      .sort((a, b) => {
        const ia = POPULAR_SPECIALTY_ORDER.indexOf(a.name);
        const ib = POPULAR_SPECIALTY_ORDER.indexOf(b.name);
        if (ia === -1 && ib === -1) return 0;
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
      })
      .slice(0, 8);
  }, [specialties]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Stethoscope className="w-12 h-12 text-primary animate-bounce" strokeWidth={1.75} />
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
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-brand-bluePale flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-brand-blue" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-heading font-semibold text-foreground">Íconos de especialidades</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Son las 8 que se ven en "Especialidades más buscadas" en la página de inicio. Sube cualquier imagen (jpg, png, lo que sea) y aquí mismo se recorta automáticamente a cuadrada y se convierte a WebP, para que todas queden del mismo tamaño.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {homepageSpecialties.map((s) => {
            const CurrentIcon = ICONS[s.icon] || Heart;
            const isOpen = pickerOpenFor === s.id;
            const isUploading = uploadingIconFor === s.id;
            return (
              <div key={s.id} className="relative">
                <button
                  onClick={() => setPickerOpenFor(isOpen ? null : s.id)}
                  className="w-full flex flex-col items-center gap-2 p-3 rounded-xl border border-border/50 hover:border-brand-blue/40 hover:bg-brand-bluePale/30 transition-colors text-center"
                >
                  <span className={`w-12 h-12 flex-shrink-0 overflow-hidden flex items-center justify-center ${s.icon_image_url ? "rounded-lg" : "rounded-full bg-brand-bluePale"}`}>
                    {s.icon_image_url ? (
                      <img src={s.icon_image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <CurrentIcon className="w-5 h-5 text-brand-blue" />
                    )}
                  </span>
                  <span className="text-xs font-medium text-foreground truncate w-full">{s.name}</span>
                </button>

                {isOpen && (
                  <div className="absolute z-20 top-full mt-1 left-1/2 -translate-x-1/2 w-72 bg-white rounded-2xl border border-border/50 shadow-xl p-3">
                    <div className="flex items-center justify-between mb-2 px-1">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">"{s.name}"</p>
                      <button onClick={() => setPickerOpenFor(null)} className="text-muted-foreground hover:text-foreground">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <label className="flex items-center justify-center gap-2 w-full mb-3 px-3 py-2.5 rounded-xl border border-dashed border-brand-blue/40 bg-brand-bluePale/30 text-xs font-medium text-brand-navy cursor-pointer hover:bg-brand-bluePale/60 transition-colors">
                      {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      {isUploading ? "Procesando..." : "Subir imagen propia"}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadSpecialtyIconImage(s, e)} disabled={isUploading} />
                    </label>
                    <p className="text-[10px] text-muted-foreground text-center -mt-2 mb-3">Se recorta a cuadrada y se convierte a WebP automáticamente</p>
                    {s.icon_image_url && (
                      <button
                        onClick={() => removeSpecialtyIconImage(s)}
                        className="flex items-center justify-center gap-1.5 w-full mb-3 text-xs font-medium text-destructive hover:underline"
                      >
                        <X className="w-3 h-3" />
                        Quitar imagen y usar ícono
                      </button>
                    )}

                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 px-1">O elegir un ícono</p>
                    <div className="grid grid-cols-5 gap-1.5">
                      {ICON_NAMES.map((name) => {
                        const OptionIcon = ICONS[name];
                        const active = !s.icon_image_url && (s.icon || "Heart") === name;
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
        </div>
      </section>
    </div>
  );
}
