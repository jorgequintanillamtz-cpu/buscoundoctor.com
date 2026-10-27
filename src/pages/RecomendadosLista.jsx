import { recordRecommendedViews } from "@/lib/recommendedViews";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Heart, ShieldQuestion, Search, PenLine, ChevronRight, ArrowLeft } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LoadingLogo from "@/components/LoadingLogo";
import LoadError from "@/components/LoadError";
import RecommendedAvatar from "@/components/RecommendedAvatar";

function setMeta(name, content) {
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) { el = document.createElement("meta"); el.setAttribute("name", name); document.head.appendChild(el); }
  el.setAttribute("content", content);
}

const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const OTHER = "Otras especialidades";

// /recomendados -- doctores recomendados por pacientes, por especialidad (CLAUDE.md §8r, paso 8).
// Primero se ven todas las especialidades (con cuántos doctores tiene cada una) y al elegir una
// (?especialidad=…, así el botón "atrás" del navegador funciona) salen sus doctores. Solo aparecen los que tienen al menos 1 recomendación aprobada y la cédula
// comprobada por el equipo (lo filtra la base de datos; desde 2026-10-26 ya no se piden 3). Son doctores SIN perfil verificado: por eso la etiqueta gris y el aviso arriba. Durante
// el piloto no lleva enlaces desde el sitio y es `noindex`.
export default function RecomendadosLista() {
  const [list, setList] = useState([]);
  const [state, setState] = useState("loading"); // loading | ok | error
  const [q, setQ] = useState("");
  const [params, setParams] = useSearchParams();
  const selectedId = params.get("especialidad") || "";

  const load = useCallback(async () => {
    setState("loading");
    try {
      const { data } = await base44.functions.invoke("listRecommendedDoctors");
      setList(Array.isArray(data) ? data : []);
      setState("ok");
    } catch {
      setState("error");
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    document.title = "Doctores recomendados por pacientes | BuscoUnDoctor";
    setMeta("description", "Doctores en Monterrey recomendados por pacientes, por especialidad. Perfiles sin verificar.");
    setMeta("robots", "noindex, nofollow");
  }, []);

  const groups = useMemo(() => {
    const k = norm(q.trim());
    const filtered = k.length >= 2 ? list.filter((d) => norm(d.full_name).includes(k) || norm(d.specialty).includes(k)) : list;
    const map = new Map();
    filtered.forEach((d) => {
      const key = d.specialty || OTHER;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(d);
    });
    return [...map.entries()]
      .sort((a, b) => (a[0] === OTHER) - (b[0] === OTHER) || a[0].localeCompare(b[0], "es"))
      .map(([specialty, doctors]) => ({ specialty, doctors, id: "esp-" + norm(specialty).replace(/[^a-z0-9]+/g, "-") }));
  }, [list, q]);

  const selected = useMemo(() => groups.find((g) => g.id === selectedId) || null, [groups, selectedId]);
  useEffect(() => { window.scrollTo(0, 0); }, [selectedId]);
  // Impresión: los doctores de la especialidad abierta aparecieron en la lista.
  useEffect(() => { if (selected) recordRecommendedViews(selected.doctors.map((d) => d.slug), "impression"); }, [selected]);

  if (state === "loading") return <div className="min-h-[60vh] flex items-center justify-center"><LoadingLogo /></div>;
  if (state === "error") return <LoadError onRetry={load} />;

  return (
    <div className="bg-brand-canvas min-h-[70vh] py-8 sm:py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-5">
        <div>
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-foreground flex items-center gap-2">
            <Heart className="w-6 h-6 text-red-500 fill-red-500" aria-hidden="true" /> Doctores recomendados por pacientes
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            Perfiles sin verificar. Son opiniones de pacientes, no una valoración médica.
          </p>
        </div>

        {list.length === 0 ? (
          <div className="bg-card rounded-3xl border border-brand-canvasBorder p-8 text-center">
            <Heart className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" aria-hidden="true" />
            <p className="font-medium text-foreground">Aún no hay doctores en esta lista.</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">Aparecen aquí cuando reciben una recomendación de un paciente y revisamos su cédula. ¿Tienes un doctor que recomendar?</p>
            <Button asChild className="mt-4 rounded-xl min-h-[44px] gap-2 bg-brand-augusta hover:bg-brand-augusta/90 text-white">
              <Link to="/recomendaciones"><PenLine className="w-4 h-4" /> Recomendar a un doctor</Link>
            </Button>
          </div>
        ) : (
          <>
            {!selected && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o especialidad..." className="pl-9 h-11 rounded-xl text-sm bg-card" />
            </div>
            )}

            {selected ? (
              <section className="bg-card rounded-3xl border border-brand-canvasBorder shadow-card p-5 sm:p-6">
                <button type="button" onClick={() => setParams({})} className="text-sm text-brand-blue hover:underline inline-flex items-center gap-1">
                  <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Todas las especialidades
                </button>
                <h2 className="font-heading font-bold text-xl text-foreground mt-3">{selected.specialty}</h2>
                <p className="text-xs text-muted-foreground">{selected.doctors.length} {selected.doctors.length === 1 ? "doctor recomendado" : "doctores recomendados"}, de más a menos recomendaciones</p>
                <div className="mt-3 space-y-2">
                  {selected.doctors.map((d) => (
                    <Link
                      key={d.slug}
                      to={`/recomendado/${d.slug}`}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 rounded-xl border border-border/60 px-4 py-3 hover:border-primary/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <RecommendedAvatar photo={d.photo} name={d.full_name} className="w-12 h-12" />
                        <div className="min-w-0">
                          <p className="font-heading font-semibold text-foreground break-words">{d.full_name}</p>
                          {d.zone && <p className="text-sm text-muted-foreground break-words">{d.zone}</p>}
                        </div>
                      </div>
                      <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-1 flex-shrink-0">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          <ShieldQuestion className="w-3 h-3" aria-hidden="true" /> Sin verificar
                        </span>
                        <span className="text-xs text-foreground">{d.count} recomendaciones</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ) : groups.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No encontramos doctores ni especialidades con ese nombre.</p>
            ) : (
              <div>
                <h2 className="font-heading font-semibold text-foreground mb-3">Elige una especialidad</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {groups.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setParams({ especialidad: g.id })}
                      className="flex items-center justify-between gap-3 text-left bg-card rounded-2xl border border-brand-canvasBorder px-4 py-4 hover:border-primary/40 hover:shadow-card transition-all min-h-[64px]"
                    >
                      <span className="min-w-0">
                        <span className="block font-heading font-semibold text-foreground break-words">{g.specialty}</span>
                        <span className="block text-sm text-muted-foreground">{g.doctors.length} {g.doctors.length === 1 ? "doctor" : "doctores"}</span>
                      </span>
                      <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="text-center pt-2">
              <Button asChild variant="outline" className="rounded-xl min-h-[44px] gap-2">
                <Link to="/recomendaciones"><PenLine className="w-4 h-4" /> Recomendar a un doctor</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
