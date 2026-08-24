import { Button } from "@/components/ui/button";
import { Loader2, Camera, User, Star } from "lucide-react";
import StepShell from "./StepShell";

// Paso 3 del wizard de registro de médicos ("Agrega tus fotos"). Extraído a
// su propio componente por la misma razón que StepDatos.jsx y
// StepUbicacion.jsx. Los handlers de subida (handleProfilePhotoUpload /
// handleGalleryUpload) se reciben por props porque dependen de quién los usa:
// en el registro real suben el archivo y guardan la URL en el borrador; en
// la vista de previsualización del admin (AdminVistaRegistro.jsx) hacen lo
// mismo pero solo en memoria, sin crear ningún Specialist.
export default function StepFotos({
  data,
  update,
  error,
  uploadingPhoto,
  uploadingGallery,
  handleProfilePhotoUpload,
  handleGalleryUpload,
}) {
  return (
    <StepShell title="Agrega tus fotos" subtitle="Los perfiles con foto generan más confianza — todo esto es opcional, puedes hacerlo después" error={error}>
      <div className="sm:col-span-2">
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Foto de perfil</label>
        <p className="text-xs text-muted-foreground mb-2">Es la foto que ven los pacientes junto a tu nombre en tarjetas y resultados de búsqueda — así se vería:</p>
        {/* Vista previa en vivo, con los datos que ya escribió en el paso 1 */}
        <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-3 flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-muted flex-shrink-0 border border-border/50 flex items-center justify-center">
            {data.profile_photo ? (
              <img src={data.profile_photo} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{data.title} {data.full_name || "Tu nombre"}</p>
            <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
              {data.specialty.trim() || "Tu especialidad"} <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" /> 4.9
            </p>
          </div>
        </div>
        {data.profile_photo ? (
          <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => update("profile_photo", "")}>Quitar foto</Button>
        ) : (
          <label className="flex items-center justify-center gap-2 h-11 rounded-xl border border-dashed border-border text-sm text-muted-foreground cursor-pointer hover:bg-accent/30 transition-colors">
            {uploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            {uploadingPhoto ? "Subiendo..." : "Subir foto de perfil"}
            <input type="file" accept="image/*" className="hidden" onChange={handleProfilePhotoUpload} disabled={uploadingPhoto} />
          </label>
        )}
      </div>
      <div className="sm:col-span-2">
        <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Fotos de tu consultorio o trabajo</label>
        <p className="text-xs text-muted-foreground mb-2">Se muestran en una galería dentro de tu perfil público. Fotos de tu consultorio, equipo o certificados le dan confianza a pacientes que no te conocen todavía.</p>
        {data.gallery.length > 0 && (
          <div className="grid grid-cols-4 gap-2 mb-2">
            {data.gallery.map((url, i) => (
              <div key={url + i} className="relative">
                <img src={url} alt="" className="w-full aspect-square rounded-lg object-cover" />
                <button type="button" onClick={() => update("gallery", data.gallery.filter((_, idx) => idx !== i))}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-foreground text-background text-xs flex items-center justify-center">×</button>
              </div>
            ))}
          </div>
        )}
        <label className="flex items-center justify-center gap-2 h-11 rounded-xl border border-dashed border-border text-sm text-muted-foreground cursor-pointer hover:bg-accent/30 transition-colors">
          {uploadingGallery ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
          {uploadingGallery ? "Subiendo..." : "Agregar fotos"}
          <input type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryUpload} disabled={uploadingGallery} />
        </label>
      </div>
    </StepShell>
  );
}
