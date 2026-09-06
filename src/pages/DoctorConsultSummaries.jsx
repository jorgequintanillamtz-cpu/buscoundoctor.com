import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  MessageCircle,
  Plus,
  Copy,
  Check,
  FileText,
  Send,
  Palette,
  PenTool,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import SignaturePad from "@/components/consult/SignaturePad";

/**
 * Página del panel del doctor para crear y enviar resúmenes de consulta.
 * Ruta: /panel-medico/resumen
 *
 * El doctor captura teléfono del paciente + texto del resumen. Al guardar,
 * se genera un link /resumen/[id] y un link de WhatsApp (wa.me) para que el
 * doctor lo envíe manualmente con un tap. No conecta ninguna API de WhatsApp
 * Business — el envío es click-to-chat manual.
 */
export default function DoctorConsultSummaries() {
  const [status, setStatus] = useState("loading"); // loading | no-profile | ready
  const [specialistId, setSpecialistId] = useState(null);
  const [summaries, setSummaries] = useState([]);
  const [loadingSummaries, setLoadingSummaries] = useState(true);

  // Form state
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [summaryText, setSummaryText] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastCreated, setLastCreated] = useState(null); // { id, phone, link }
  const [copiedId, setCopiedId] = useState(null);

  // Preference state
  const [prefTheme, setPrefTheme] = useState("handwritten_caveat");
  const [prefId, setPrefId] = useState(null);
  const [prefSaving, setPrefSaving] = useState(false);
  const [signatureStrokes, setSignatureStrokes] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const u = await base44.auth.me().catch(() => null);
      if (!active) return;
      if (!u) {
        base44.auth.redirectToLogin(window.location.href);
        return;
      }
      const own = await base44.entities.Specialist.filter({ owner_user_id: u.id }).catch(() => []);
      if (!active) return;
      if (own.length === 0) {
        setStatus("no-profile");
        return;
      }
      setSpecialistId(own[0].id);
      setStatus("ready");
      loadSummaries();
      loadPreferences(own[0].id);
    })();
    return () => { active = false; };
  }, []);

  const loadSummaries = async () => {
    setLoadingSummaries(true);
    try {
      const list = await base44.entities.ConsultSummary.list("-created_date", 50);
      setSummaries(list || []);
    } catch {
      // RLS ya filtra por created_by_id
    } finally {
      setLoadingSummaries(false);
    }
  };

  const loadPreferences = async (specId) => {
    try {
      const prefs = await base44.entities.DoctorConsultPreferences.filter({
        doctor_id: specId,
      });
      if (prefs && prefs.length > 0) {
        setPrefId(prefs[0].id);
        setPrefTheme(prefs[0].summary_theme || "handwritten_caveat");
        setSignatureStrokes(prefs[0].signature_strokes || "");
      }
    } catch {
      // Sin preferencia, usar default
    }
  };

  const handleThemeChange = async (newTheme) => {
    if (prefSaving || newTheme === prefTheme) return;
    const prevTheme = prefTheme;
    setPrefTheme(newTheme);
    setPrefSaving(true);
    try {
      if (prefId) {
        await base44.entities.DoctorConsultPreferences.update(prefId, {
          summary_theme: newTheme,
        });
      } else {
        const created = await base44.entities.DoctorConsultPreferences.create({
          doctor_id: specialistId,
          summary_theme: newTheme,
        });
        if (created?.id) setPrefId(created.id);
      }
      toast.success("Diseño actualizado");
    } catch (err) {
      setPrefTheme(prevTheme);
      toast.error("Error al guardar: " + err.message);
    } finally {
      setPrefSaving(false);
    }
  };

  const handleSaveSignature = async (newStrokes) => {
    const strokesJson = newStrokes.length > 0 ? JSON.stringify(newStrokes) : "";
    try {
      if (prefId) {
        await base44.entities.DoctorConsultPreferences.update(prefId, {
          signature_strokes: strokesJson,
        });
      } else {
        const created = await base44.entities.DoctorConsultPreferences.create({
          doctor_id: specialistId,
          summary_theme: prefTheme,
          signature_strokes: strokesJson,
        });
        if (created?.id) setPrefId(created.id);
      }
      setSignatureStrokes(strokesJson);
      toast.success("Firma guardada");
    } catch (err) {
      toast.error("Error al guardar: " + err.message);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!patientPhone.trim() || !summaryText.trim()) {
      toast.error("Teléfono y resumen son obligatorios");
      return;
    }
    setSaving(true);
    try {
      const created = await base44.entities.ConsultSummary.create({
        doctor_id: specialistId,
        patient_name: patientName.trim(),
        patient_phone: patientPhone.trim(),
        summary_text: summaryText.trim(),
      });
      const link = `${window.location.origin}/resumen/${created.id}`;
      setLastCreated({ id: created.id, phone: patientPhone.trim(), link });
      toast.success("Resumen guardado");
      setPatientName("");
      setPatientPhone("");
      setSummaryText("");
      loadSummaries();
    } catch (err) {
      toast.error("Error al guardar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const buildWhatsAppUrl = (phone, link) => {
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const message = `Hola, aquí está el resumen de tu consulta médica:\n\n${link}\n\nPuedes revisarlo y calificar tu atención en el enlace.`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  const handleCopy = (link, id) => {
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      return new Date(dateStr).toLocaleString("es-MX", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  // --- Shell ---
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (status === "no-profile") {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
          <Link to="/panel-medico" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="w-4 h-4" />
            Volver al panel
          </Link>
          <div className="max-w-md mx-auto text-center py-16">
            <h1 className="font-heading font-bold text-xl text-foreground">Aún no tienes un perfil de médico</h1>
            <p className="text-sm text-muted-foreground mt-2">Necesitas un perfil registrado para crear resúmenes de consulta.</p>
            <Button className="mt-5 rounded-xl" asChild>
              <Link to="/registro-medico">Registrarme como médico</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        <Link to="/panel-medico" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" />
          Volver al panel
        </Link>

        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-10 h-10 rounded-xl bg-brand-navy flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-xl text-foreground">Resumen de consulta</h1>
            <p className="text-sm text-muted-foreground">Crea un resumen y envíaselo a tu paciente por WhatsApp.</p>
          </div>
        </div>

        {/* Preferencias de diseño */}
        <div className="bg-card rounded-2xl border border-border p-5 mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Palette className="w-4 h-4 text-primary" />
            <h3 className="font-heading font-semibold text-sm text-foreground">Diseño del resumen</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Elige cómo se ve la página que recibe tu paciente.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Clásico */}
            <button
              type="button"
              onClick={() => handleThemeChange("default")}
              disabled={prefSaving}
              className={`rounded-xl border-2 p-3 text-left transition-colors disabled:opacity-60 ${
                prefTheme === "default" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
              }`}
            >
              <div className="rounded-lg p-2.5 mb-2 h-16 flex flex-col justify-center" style={{ background: "#0B1E4D" }}>
                <div className="space-y-1.5">
                  <div className="h-1.5 w-3/4 rounded-full bg-white/70" />
                  <div className="h-1.5 w-full rounded-full bg-white/40" />
                  <div className="h-1.5 w-5/6 rounded-full bg-white/40" />
                </div>
              </div>
              <p className="text-xs font-semibold text-foreground">Clásico</p>
              <p className="text-[11px] text-muted-foreground">Sin estilo de mano</p>
            </button>
            {/* Kalam */}
            <button
              type="button"
              onClick={() => handleThemeChange("handwritten_kalam")}
              disabled={prefSaving}
              className={`rounded-xl border-2 p-3 text-left transition-colors disabled:opacity-60 ${
                prefTheme === "handwritten_kalam" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
              }`}
            >
              <div className="rounded-lg p-2.5 mb-2 h-16 flex flex-col justify-center" style={{ background: "#FFFFFF", border: "1px solid #DCE9FF" }}>
                <p style={{ fontFamily: "'Kalam', cursive", fontSize: "13px", color: "#0B1E4D", lineHeight: "1.3" }}>Receta médica</p>
              </div>
              <p className="text-xs font-semibold text-foreground">Kalam</p>
              <p className="text-[11px] text-muted-foreground">Mano imprenta</p>
            </button>
            {/* Caveat */}
            <button
              type="button"
              onClick={() => handleThemeChange("handwritten_caveat")}
              disabled={prefSaving}
              className={`rounded-xl border-2 p-3 text-left transition-colors disabled:opacity-60 ${
                prefTheme === "handwritten_caveat" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
              }`}
            >
              <div className="rounded-lg p-2.5 mb-2 h-16 flex flex-col justify-center" style={{ background: "#FFFFFF", border: "1px solid #DCE9FF" }}>
                <p style={{ fontFamily: "'Caveat', cursive", fontSize: "15px", color: "#0B1E4D", lineHeight: "1.3" }}>Receta médica</p>
              </div>
              <p className="text-xs font-semibold text-foreground">Caveat</p>
              <p className="text-[11px] text-muted-foreground">Cursiva de mano</p>
            </button>
          </div>
          {prefSaving && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" />
              Guardando…
            </p>
          )}
        </div>

        {/* Firma del doctor */}
        <div className="bg-card rounded-2xl border border-border p-5 mb-6">
          <div className="flex items-center gap-2 mb-1">
            <PenTool className="w-4 h-4 text-primary" />
            <h3 className="font-heading font-semibold text-sm text-foreground">Tu firma</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Dibuja tu firma una vez. Se animará al final del resumen de tus pacientes como si la estuvieras escribiendo.</p>
          <SignaturePad onSave={handleSaveSignature} initialStrokes={signatureStrokes} />
        </div>

        {/* Formulario */}
        <form onSubmit={handleSave} className="bg-card rounded-2xl border border-border p-5 space-y-4 mb-6">
          <div className="space-y-1.5">
            <Label htmlFor="patient_name">Nombre del paciente (opcional)</Label>
            <Input
              id="patient_name"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="Ej. María González"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="patient_phone">Teléfono del paciente *</Label>
            <Input
              id="patient_phone"
              type="tel"
              value={patientPhone}
              onChange={(e) => setPatientPhone(e.target.value)}
              placeholder="Ej. 521234567890 (con código de país)"
              className="rounded-xl"
              required
            />
            <p className="text-xs text-muted-foreground">Incluye código de país. Ej: 52 para México + 10 dígitos.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="summary_text">Resumen / Receta *</Label>
            <Textarea
              id="summary_text"
              value={summaryText}
              onChange={(e) => setSummaryText(e.target.value)}
              placeholder="Escribe el resumen de la consulta, receta o indicaciones…"
              className="rounded-xl min-h-[120px]"
              required
            />
          </div>
          <Button type="submit" disabled={saving} className="w-full rounded-xl gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {saving ? "Guardando…" : "Guardar y generar link"}
          </Button>
        </form>

        {/* Link recién creado + botón de WhatsApp */}
        {lastCreated && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Check className="w-5 h-5 text-emerald-600" />
              <p className="font-heading font-semibold text-emerald-800 text-sm">Resumen listo para enviar</p>
            </div>
            <div className="flex items-center gap-2 bg-white rounded-xl border border-emerald-200 px-3 py-2.5 mb-3">
              <span className="text-xs text-muted-foreground truncate flex-1 font-mono">{lastCreated.link}</span>
              <button
                type="button"
                onClick={() => handleCopy(lastCreated.link, lastCreated.id)}
                className="flex-shrink-0 text-emerald-600 hover:text-emerald-700"
              >
                {copiedId === lastCreated.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <a
              href={buildWhatsAppUrl(lastCreated.phone, lastCreated.link)}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 font-semibold py-3 rounded-xl text-white transition-transform active:scale-95"
              style={{ background: "#23D366" }}
            >
              <Send className="w-4 h-4" />
              Enviar por WhatsApp
            </a>
          </div>
        )}

        {/* Lista de resúmenes existentes */}
        <div>
          <h2 className="font-heading font-semibold text-sm text-foreground mb-3">Resúmenes recientes</h2>
          {loadingSummaries ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : summaries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Aún no has creado resúmenes.</p>
          ) : (
            <div className="space-y-2.5">
              {summaries.map((s) => {
                const link = `${window.location.origin}/resumen/${s.id}`;
                return (
                  <div key={s.id} className="bg-card rounded-xl border border-border p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">
                          {s.patient_name || "Paciente"}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatDate(s.created_date)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(link, s.id)}
                        className="flex-shrink-0 text-muted-foreground hover:text-foreground"
                      >
                        {copiedId === s.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                      {s.summary_text}
                    </p>
                    <a
                      href={buildWhatsAppUrl(s.patient_phone, link)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 text-sm font-medium py-2.5 rounded-xl text-white transition-transform active:scale-95"
                      style={{ background: "#23D366" }}
                    >
                      <MessageCircle className="w-4 h-4" />
                      Enviar por WhatsApp
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}