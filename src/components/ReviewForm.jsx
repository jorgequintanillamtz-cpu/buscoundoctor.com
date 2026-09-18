import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Star, ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { fileToWebP } from "@/lib/fileToWebP";

const CATEGORY_RATINGS = [
  { key: "ratingPunctuality", field: "rating_punctuality", label: "Puntualidad" },
  { key: "ratingTreatment", field: "rating_treatment", label: "Trato" },
  { key: "ratingFacilities", field: "rating_facilities", label: "Instalaciones" },
];

function SmallStarInput({ value, onChange, label }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            aria-label={`${star} estrellas`}
            onClick={() => onChange(value === star ? 0 : star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            className="transition-transform hover:scale-110"
          >
            <Star className={`w-5 h-5 ${(hover || value) >= star ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`} />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ReviewForm({ specialist }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [name, setName] = useState("");
  const [comment, setComment] = useState("");
  const [consultationDate, setConsultationDate] = useState("");
  const [treatmentPerformed, setTreatmentPerformed] = useState("");
  const [categoryRatings, setCategoryRatings] = useState({ ratingPunctuality: 0, ratingTreatment: 0, ratingFacilities: 0 });
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoPreview, setPhotoPreview] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  // Honeypot anti-bot: campo invisible que solo un script rellena. Ver
  // nota completa en src/components/AppointmentForm.jsx.
  const [website, setWebsite] = useState("");

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoPreview(URL.createObjectURL(file));
    setUploadingPhoto(true);
    try {
      const optimized = await fileToWebP(file);
      // Bucket propio (no "specialist-photos"): quien deja una reseña no
      // inicia sesión, y specialist-photos solo acepta subidas del dueño
      // autenticado del perfil (auth.uid()). review-photos permite subir sin
      // sesión, igual que la tabla review ya acepta inserts anónimos.
      const { file_url } = await base44.integrations.Core.UploadFile({ file: optimized, bucket: "review-photos" });
      setPhotoUrl(file_url);
    } catch {
      toast.error("No se pudo subir la foto");
      setPhotoPreview("");
    }
    setUploadingPhoto(false);
  };

  const removePhoto = () => {
    setPhotoUrl("");
    setPhotoPreview("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (website) { setSubmitted(true); return; }
    if (rating === 0) {
      toast.error("Por favor selecciona una calificación");
      return;
    }
    setLoading(true);
    await base44.entities.Review.create({
      specialist_id: specialist.id,
      specialist_name: specialist.full_name,
      owner_user_id: specialist.owner_user_id || null,
      patient_name: name,
      rating,
      comment,
      consultation_date: consultationDate || undefined,
      treatment_performed: treatmentPerformed || undefined,
      rating_punctuality: categoryRatings.ratingPunctuality || undefined,
      rating_treatment: categoryRatings.ratingTreatment || undefined,
      rating_facilities: categoryRatings.ratingFacilities || undefined,
      photo_url: photoUrl || undefined,
      approved: false,
    });
    setLoading(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="bg-accent/50 rounded-2xl p-6 text-center">
        <p className="text-2xl mb-2">🎉</p>
        <p className="font-heading font-semibold text-foreground">¡Gracias por tu reseña!</p>
        <p className="text-sm text-muted-foreground mt-1">Será revisada por nuestro equipo antes de publicarse.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="text"
        name="website"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", opacity: 0 }}
      />
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">Tu calificación *</label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              aria-label={`${star} estrellas`}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              className="transition-transform hover:scale-110"
            >
              <Star
                className={`w-8 h-8 ${(hover || rating) >= star ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`}
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-foreground mb-1 block">Tu nombre *</label>
        <Input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Escribe tu nombre"
          className="rounded-xl"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-foreground mb-1 block">Comentario *</label>
        <Textarea
          required
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Comparte tu experiencia con este especialista..."
          className="rounded-xl min-h-[90px] resize-none"
        />
      </div>

      <div className="rounded-xl border border-border/70 p-3 space-y-2.5">
        <p className="text-xs font-medium text-foreground">Califica algunos detalles (opcional)</p>
        {CATEGORY_RATINGS.map((c) => (
          <SmallStarInput
            key={c.key}
            label={c.label}
            value={categoryRatings[c.key]}
            onChange={(v) => setCategoryRatings((prev) => ({ ...prev, [c.key]: v }))}
          />
        ))}
      </div>

      <div>
        <label className="text-sm font-medium text-foreground mb-1 block">Agrega una foto (opcional)</label>
        {photoPreview ? (
          <div className="relative w-24 h-24">
            <img src={photoPreview} alt="Foto adjunta a la reseña" className="w-24 h-24 object-cover rounded-xl border border-border/50" />
            {uploadingPhoto && (
              <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center text-white text-xs">Subiendo...</div>
            )}
            <button
              type="button"
              onClick={removePhoto}
              aria-label="Quitar foto"
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white border border-border shadow flex items-center justify-center"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
        ) : (
          <label className="flex items-center gap-2 w-fit text-sm text-muted-foreground border border-dashed border-border/70 rounded-xl px-3 py-2 cursor-pointer hover:border-border">
            <ImagePlus className="w-4 h-4" />
            Subir foto
            <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
          </label>
        )}
      </div>

      <div className="rounded-xl border border-dashed border-border/70 p-3 space-y-3 bg-muted/30">
        <p className="text-xs font-medium text-foreground">¿Quieres el sello "Cliente verificado"? (opcional)</p>
        <p className="text-xs text-muted-foreground -mt-2">Compártenos estos datos para que nuestro equipo pueda confirmar tu visita.</p>
        <div>
          <label className="text-xs font-medium text-foreground mb-1 block">Fecha de tu consulta</label>
          <Input
            type="date"
            value={consultationDate}
            onChange={(e) => setConsultationDate(e.target.value)}
            className="rounded-xl"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-foreground mb-1 block">¿Qué consulta o tratamiento te realizaron?</label>
          <Input
            value={treatmentPerformed}
            onChange={(e) => setTreatmentPerformed(e.target.value)}
            placeholder="Ej. Limpieza dental, consulta general..."
            className="rounded-xl"
          />
        </div>
      </div>

      <Button type="submit" disabled={loading || uploadingPhoto} className="w-full min-h-[44px] rounded-xl font-heading font-semibold">
        {loading ? "Enviando..." : uploadingPhoto ? "Subiendo foto..." : "Enviar reseña"}
      </Button>
      <p className="text-xs text-muted-foreground text-center">Tu reseña será revisada antes de publicarse.</p>
    </form>
  );
}