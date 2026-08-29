import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Upload, X, Image as ImageIcon, Share2, Loader2, Stethoscope } from "lucide-react";

// Mismo orden que usa Home.jsx para elegir las 5 "Especialidades
// destacadas" (tarjetas grandes) de la página de inicio — son las únicas
// cuya imagen se ve ahí, así que son las únicas que tiene sentido editar aquí.
const POPULAR_SPECIALTY_ORDER = [
  "Dentista", "Ginecología", "Pediatría", "Dermatología", "Psicología",
];

// Proporción y ancho objetivo (en px) al que se recorta/redimensiona cada
// imagen de tarjeta destacada subida, para que todas midan exactamente lo
// mismo sin importar la foto original (rectangular, no cuadrada, porque las
// tarjetas del Home son horizontales tipo 4:3).
const HOME_CARD_RATIO = 4 / 3;
const HOME_CARD_WIDTH = 800;

// Recorta cualquier imagen al centro en la proporción 4:3, la redimensiona a
// un ancho fijo y la convierte a WebP — así no depende de que el admin suba
// ya una imagen con la proporción o el formato correcto, la app lo hace sola.
function cropToRatioWebp(file, ratio = HOME_CARD_RATIO, targetWidth = HOME_CARD_WIDTH, quality = 0.9) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const srcRatio = img.width / img.height;
      let sx, sy, sw, sh;
      if (srcRatio > ratio) {
        sh = img.height;
        sw = sh * ratio;
        sx = (img.width - sw) / 2;
        sy = 0;
      } else {
        sw = img.width;
        sh = sw / ratio;
        sx = 0;
        sy = (img.height - sh) / 2;
      }
      const targetHeight = Math.round(targetWidth / ratio);
      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        if (!blob) { reject(new Error("No se pudo procesar la imagen")); return; }
        const baseName = (file.name || "tarjeta").replace(/\.[^.]+$/, "");
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
  const [uploadingFamily, setUploadingFamily] = useState(false);
  const [uploadingDoctor, setUploadingDoctor] = useState(false);

  const [specialties, setSpecialties] = useState([]);
  const [uploadingHomeCardFor, setUploadingHomeCardFor] = useState(null);

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

  const uploadFamily = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingFamily(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await saveSettings({ family_photo_url: file_url });
    } catch { toast.error("Error al subir la imagen"); }
    setUploadingFamily(false);
    e.target.value = "";
  };

  const uploadDoctor = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingDoctor(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await saveSettings({ doctor_photo_url: file_url });
    } catch { toast.error("Error al subir la imagen"); }
    setUploadingDoctor(false);
    e.target.value = "";
  };

  const uploadHomeCardImage = async (specialty, e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingHomeCardFor(specialty.id);
    try {
      const cropped = await cropToRatioWebp(file);
      const { file_url } = await base44.integrations.Core.UploadFile({ file: cropped });
      setSpecialties((prev) => prev.map((s) => (s.id === specialty.id ? { ...s, home_card_image_url: file_url } : s)));
      await base44.entities.Specialty.update(specialty.id, { home_card_image_url: file_url });
      toast.success(`Imagen de "${specialty.name}" actualizada`);
    } catch {
      toast.error("Error al subir la imagen");
    }
    setUploadingHomeCardFor(null);
    e.target.value = "";
  };

  const removeHomeCardImage = async (specialty) => {
    setSpecialties((prev) => prev.map((s) => (s.id === specialty.id ? { ...s, home_card_image_url: "" } : s)));
    try {
      await base44.entities.Specialty.update(specialty.id, { home_card_image_url: "" });
      toast.success(`Se quitó la imagen de "${specialty.name}"`);
    } catch (e) {
      toast.error("No se pudo guardar: " + e.message);
    }
  };

  // Solo las 5 especialidades que se muestran como tarjetas destacadas en
  // el Home, en el mismo orden que usa Home.jsx.
  const homeCardSpecialties = useMemo(() => {
    return POPULAR_SPECIALTY_ORDER
      .map((name) => specialties.find((s) => s.name === name))
      .filter(Boolean);
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

      {/* Fotos de la sección "¡Es gratis!" (dos columnas: pacientes / doctores) */}
      <section className="bg-card rounded-2xl border border-border/50 p-5 sm:p-6 mb-6">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-brand-bluePale flex items-center justify-center flex-shrink-0">
            <ImageIcon className="w-5 h-5 text-brand-blue" />
          </div>
          <div>
            <h2 className="font-heading font-semibold text-foreground">Fotos de la sección "¡Es gratis!"</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Esta sección del Home tiene dos columnas: una para pacientes y otra invitando a doctores a registrarse. Si no subes alguna imagen, esa columna no muestra foto.
            </p>
          </div>
        </div>

        {/* Columna pacientes */}
        <div className="flex flex-col sm:flex-row items-start gap-4 pb-5 mb-5 border-b border-border/50">
          <div className="w-full sm:w-56 h-48 rounded-xl border border-border/50 bg-muted/40 overflow-hidden flex items-center justify-center flex-shrink-0">
            {settings.family_photo_url ? (
              <img src={settings.family_photo_url} alt="Foto lado pacientes" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs text-muted-foreground text-center px-4">Sin imagen todavía</span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-brand-navy uppercase tracking-wide">Lado pacientes</p>
            <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border/60 text-sm font-medium cursor-pointer hover:bg-muted transition-colors w-fit">
              {uploadingFamily ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {settings.family_photo_url ? "Cambiar imagen" : "Subir imagen"}
              <input type="file" accept="image/*" className="hidden" onChange={uploadFamily} disabled={uploadingFamily} />
            </label>
            {settings.family_photo_url && (
              <button
                onClick={() => saveSettings({ family_photo_url: "" })}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors w-fit"
              >
                <X className="w-4 h-4" />
                Quitar imagen
              </button>
            )}
          </div>
        </div>

        {/* Columna doctores */}
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="w-full sm:w-56 h-48 rounded-xl border border-border/50 bg-muted/40 overflow-hidden flex items-center justify-center flex-shrink-0">
            {settings.doctor_photo_url ? (
              <img src={settings.doctor_photo_url} alt="Foto lado doctores" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs text-muted-foreground text-center px-4">Sin imagen todavía</span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-brand-navy uppercase tracking-wide">Lado doctores (registro)</p>
            <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border/60 text-sm font-medium cursor-pointer hover:bg-muted transition-colors w-fit">
              {uploadingDoctor ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {settings.doctor_photo_url ? "Cambiar imagen" : "Subir imagen"}
              <input type="file" accept="image/*" className="hidden" onChange={uploadDoctor} disabled={uploadingDoctor} />
            </label>
            {settings.doctor_photo_url && (
              <button
                onClick={() => saveSettings({ doctor_photo_url: "" })}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors w-fit"
              >
                <X className="w-4 h-4" />
                Quitar imagen
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
