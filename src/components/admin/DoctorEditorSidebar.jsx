import { CheckCircle2, Star, AlertCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";

const SEGUROS = ["GNP", "AXA", "Metlife", "BBVA Salud", "Atlas", "Allianz", "Mapfre"];

const ESTADO_CONFIG = {
  borrador:    { label: "Borrador",     color: "bg-muted text-muted-foreground", dot: "bg-gray-400" },
  en_revision: { label: "En revisión",  color: "bg-amber-100 text-amber-700",   dot: "bg-amber-400" },
  publicado:   { label: "Publicado",    color: "bg-green-100 text-green-700",   dot: "bg-green-500" },
};

function calcScore(form) {
  const optional = [
    form.descripcion_profesional,
    form.hospital_o_consultorio,
    form.direccion,
    form.telefono,
    form.whatsapp,
    form.correo_contacto,
    form.sitio_web,
    form.foto_perfil,
    form.galeria_fotos?.length > 0,
    form.anos_experiencia,
    form.horarios,
    form.titulo_seo,
    form.descripcion_seo,
    form.precio_consulta_aproximado,
    form.sub_especialidades?.length > 0,
    form.idiomas?.length > 1,
  ];
  const filled = optional.filter(v => !!v).length;
  return Math.round((filled / optional.length) * 100);
}

function canPublish(form) {
  const cedulaOk = /^\d{7,8}$/.test(form.cedula_profesional || "");
  const nombreOk = (form.nombre_completo || "").length >= 10;
  const descWords = (form.descripcion_profesional || "").trim().split(/\s+/).filter(Boolean).length;
  return cedulaOk && nombreOk && descWords >= 150;
}

function SEOPreview({ form }) {
  const title = form.titulo_seo || (form.nombre_completo ? `${form.nombre_completo} - ${form.especialidad || "Doctor"} en ${form.ciudad || "Monterrey"}` : "Título SEO");
  const desc = form.descripcion_seo || form.descripcion_profesional?.slice(0, 160) || "Descripción del perfil...";
  const url = `buscoundoctor.com/especialista/${form.slug || "slug-del-doctor"}`;

  return (
    <div className="border border-border/50 rounded-xl p-3 bg-white space-y-0.5">
      <p className="text-xs text-muted-foreground mb-1 font-medium">Vista previa en Google</p>
      <p className="text-sm text-blue-700 font-medium leading-snug truncate">{title.slice(0, 60)}{title.length > 60 ? "..." : ""}</p>
      <p className="text-xs text-green-700 truncate">{url}</p>
      <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{desc.slice(0, 160)}{desc.length > 160 ? "..." : ""}</p>
    </div>
  );
}

export default function DoctorEditorSidebar({ form, update }) {
  const score = calcScore(form);
  const publishable = canPublish(form);
  const titleLen = (form.titulo_seo || "").length;
  const descLen = (form.descripcion_seo || "").length;

  const toggleSeguro = (seguro) => {
    const current = form.seguros_aceptados || [];
    if (current.includes(seguro)) {
      update("seguros_aceptados", current.filter(s => s !== seguro));
    } else {
      update("seguros_aceptados", [...current, seguro]);
    }
  };

  return (
    <div className="space-y-4 sticky top-4">

      {/* Score de completitud */}
      <div className="bg-card rounded-2xl border border-border/50 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-semibold text-sm">Completitud del perfil</h3>
          {score >= 80 && (
            <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
              <CheckCircle2 className="w-3 h-3" />
              Perfil completo
            </span>
          )}
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{score}% completo</span>
            <span>{score >= 80 ? "¡Excelente!" : score >= 50 ? "Sigue agregando info" : "Falta información"}</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${score >= 80 ? "bg-green-500" : score >= 50 ? "bg-amber-400" : "bg-destructive"}`}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>
      </div>

      {/* Estado del perfil */}
      <div className="bg-card rounded-2xl border border-border/50 p-4 space-y-3">
        <h3 className="font-heading font-semibold text-sm">Estado del perfil</h3>
        <div className="space-y-2">
          {Object.entries(ESTADO_CONFIG).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => {
                if (key === "publicado" && !publishable) return;
                update("estado_perfil", key);
              }}
              disabled={key === "publicado" && !publishable}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all text-sm text-left
                ${form.estado_perfil === key ? `${cfg.color} border-current/30 font-medium` : "border-border hover:bg-muted/50"}
                ${key === "publicado" && !publishable ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
              {cfg.label}
            </button>
          ))}
        </div>
        {!publishable && (
          <div className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 flex items-start gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>Para publicar: nombre ≥10 chars, cédula válida y descripción ≥150 palabras.</span>
          </div>
        )}

        {/* Destacado */}
        <div className="flex items-center justify-between pt-1 border-t border-border/50">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium">Perfil destacado</span>
          </div>
          <Switch checked={form.destacado} onCheckedChange={v => update("destacado", v)} />
        </div>
      </div>

      {/* SEO */}
      <div className="bg-card rounded-2xl border border-border/50 p-4 space-y-4">
        <h3 className="font-heading font-semibold text-sm">SEO</h3>

        <div>
          <div className="flex justify-between mb-1.5">
            <label className="text-sm font-medium">Título SEO</label>
            <span className={`text-xs ${titleLen > 60 ? "text-amber-600 font-medium" : "text-muted-foreground"}`}>{titleLen}/60</span>
          </div>
          <Input
            value={form.titulo_seo}
            onChange={e => update("titulo_seo", e.target.value)}
            className="rounded-xl text-sm"
            placeholder={`${form.especialidad || "Cardiólogo"} en ${form.ciudad || "Monterrey"} - ${form.nombre_completo || "Dr. Nombre"}`}
            maxLength={80}
          />
          {titleLen > 60 && <p className="text-xs text-amber-600 mt-1">Recomendado: máximo 60 caracteres</p>}
          {form.especialidad && form.titulo_seo && !form.titulo_seo.toLowerCase().includes(form.especialidad.toLowerCase()) && (
            <p className="text-xs text-amber-600 mt-1">Incluye la especialidad en el título para mejor SEO</p>
          )}
        </div>

        <div>
          <div className="flex justify-between mb-1.5">
            <label className="text-sm font-medium">Descripción SEO</label>
            <span className={`text-xs ${descLen > 160 ? "text-amber-600 font-medium" : "text-muted-foreground"}`}>{descLen}/160</span>
          </div>
          <textarea
            value={form.descripcion_seo}
            onChange={e => update("descripcion_seo", e.target.value)}
            className="w-full min-h-[80px] p-3 text-sm bg-white border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            placeholder="Describe brevemente qué diferencia a este doctor: experiencia, trato, especialización..."
            maxLength={200}
          />
          {descLen > 160 && <p className="text-xs text-amber-600 mt-1">Recomendado: máximo 160 caracteres</p>}
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Slug (URL)</label>
          <Input
            value={form.slug}
            onChange={e => update("slug", e.target.value)}
            className="rounded-xl text-sm font-mono"
            placeholder="dr-juan-garcia-cardiologo"
          />
          <p className="text-xs text-muted-foreground mt-1">buscoundoctor.com/especialista/{form.slug || "slug"}</p>
        </div>

        <SEOPreview form={form} />
      </div>

      {/* Seguros */}
      <div className="bg-card rounded-2xl border border-border/50 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-semibold text-sm">Seguros médicos</h3>
          <Switch checked={form.acepta_seguros} onCheckedChange={v => { update("acepta_seguros", v); if (!v) update("seguros_aceptados", []); }} />
        </div>
        {form.acepta_seguros && (
          <div className="space-y-2 pt-1">
            {SEGUROS.map(s => (
              <label key={s} className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={(form.seguros_aceptados || []).includes(s)}
                  onChange={() => toggleSeguro(s)}
                  className="w-4 h-4 rounded border-input accent-primary"
                />
                <span className="text-sm group-hover:text-foreground text-muted-foreground transition-colors">{s}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Precio */}
      <div className="bg-card rounded-2xl border border-border/50 p-4 space-y-2">
        <h3 className="font-heading font-semibold text-sm">Precio de consulta</h3>
        <Input
          value={form.precio_consulta_aproximado}
          onChange={e => update("precio_consulta_aproximado", e.target.value)}
          className="rounded-xl"
          placeholder="$800 - $1,200 MXN"
        />
      </div>
    </div>
  );
}