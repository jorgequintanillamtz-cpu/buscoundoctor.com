import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { ArrowLeft, Stethoscope, Plus, Pencil, Trash2, FileText, Package, BookOpen, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProductForm from "@/components/products/ProductForm";
import ProductCardPreview from "@/components/products/ProductCardPreview";
import DoctorPanelSidebar from "@/components/admin/DoctorPanelSidebar";

const STATUS_META = {
  draft: { label: "Borrador", cls: "bg-amber-100 text-amber-700" },
  active: { label: "Activo", cls: "bg-emerald-100 text-emerald-700" },
  inactive: { label: "Inactivo", cls: "bg-gray-100 text-gray-600" },
};

export default function DoctorProducts() {
  const [status, setStatus] = useState("loading"); // loading | no-profile | ready
  const [specialist, setSpecialist] = useState(null);
  const [products, setProducts] = useState([]);
  const [editing, setEditing] = useState(null); // product | "new" | null
  const [deletingId, setDeletingId] = useState(null);
  const [tab, setTab] = useState("mine"); // mine | library
  const [guides, setGuides] = useState([]);
  const [addingGuideId, setAddingGuideId] = useState(null);

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
      setSpecialist(own[0]);
      await Promise.all([loadProducts(own[0].id), loadGuides(own[0].specialty)]);
      setStatus("ready");
    })();
    return () => { active = false; };
  }, []);

  const loadProducts = async (doctorId) => {
    const list = await base44.entities.DoctorProduct.filter({ doctor_id: doctorId }, "-created_date", 50).catch(() => []);
    setProducts(list);
  };

  const loadGuides = async (specialty) => {
    if (!specialty) { setGuides([]); return; }
    const list = await base44.entities.Guide.filter({ specialty, status: "active" }, "-created_date", 100).catch(() => []);
    setGuides(list);
  };

  // Guías que el doctor ya agregó (para no ofrecer duplicarlas)
  const addedGuideIds = useMemo(
    () => new Set(products.filter((p) => p.source_guide_id).map((p) => p.source_guide_id)),
    [products]
  );

  const addFromLibrary = async (guide) => {
    setAddingGuideId(guide.id);
    try {
      const created = await base44.entities.DoctorProduct.create({
        doctor_id: specialist.id,
        source_guide_id: guide.id,
        title: guide.title,
        description: guide.description || "",
        price: guide.price,
        cover_image: guide.cover_image || null,
        images: Array.isArray(guide.images) ? guide.images : [],
        file_url: guide.file_url,
        status: "draft",
      });
      setProducts((prev) => [created, ...prev]);
      toast.success("Guía agregada a tu catálogo. Ajusta precio o descripción y actívala cuando quieras.");
      setTab("mine");
      setEditing(created);
    } catch (e) {
      toast.error("No se pudo agregar: " + e.message);
    }
    setAddingGuideId(null);
  };

  const toggleStatus = async (p) => {
    const next = p.status === "active" ? "inactive" : "active";
    try {
      await base44.entities.DoctorProduct.update(p.id, { status: next });
      setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, status: next } : x)));
      toast.success(`Producto marcado como ${STATUS_META[next].label.toLowerCase()}`);
    } catch (e) {
      toast.error("Error: " + e.message);
    }
  };

  const remove = async (p) => {
    if (!confirm(`¿Eliminar "${p.title}"?`)) return;
    setDeletingId(p.id);
    try {
      await base44.entities.DoctorProduct.delete(p.id);
      setProducts((prev) => prev.filter((x) => x.id !== p.id));
      toast.success("Producto eliminado");
    } catch (e) {
      toast.error("Error: " + e.message);
    }
    setDeletingId(null);
  };

  const shell = (content) => (
    <div className="min-h-screen bg-background flex">
      <DoctorPanelSidebar activePath="/panel-medico/productos" completitud={specialist?.completeness_score ?? null} />
      <div className="flex-1 min-w-0">
        <div className="lg:hidden sticky top-0 z-40 bg-brand-navy px-4 py-3 flex items-center justify-between">
          <Link to="/panel-medico" className="flex items-center gap-2 text-sm text-white/70 hover:text-white">
            <ArrowLeft className="w-4 h-4" />
            Volver al panel
          </Link>
          <h1 className="font-heading font-bold text-white text-sm flex items-center gap-2">
            <Package className="w-4 h-4" />
            Productos digitales
          </h1>
          <div className="w-20" />
        </div>
        <div className="p-4 sm:p-6 lg:p-8">{content}</div>
      </div>
    </div>
  );

  if (status === "loading") {
    return shell(
      <div className="flex items-center justify-center min-h-[40vh]">
        <Stethoscope className="w-10 h-10 text-primary animate-bounce" />
      </div>
    );
  }

  if (status === "no-profile") {
    return shell(
      <div className="max-w-md mx-auto text-center py-16">
        <h1 className="font-heading font-bold text-xl text-foreground">Aún no tienes un perfil de médico</h1>
        <p className="text-sm text-muted-foreground mt-2">Regístrate primero para poder administrar productos digitales.</p>
        <Button className="mt-5 rounded-xl" asChild>
          <Link to="/registro-medico">Registrarme como médico</Link>
        </Button>
      </div>
    );
  }

  return shell(
    <div className="max-w-5xl mx-auto">
      <div className="mb-5">
        <p className="text-sm text-muted-foreground">
          Sube guías, ebooks o documentos en PDF para venderlos a tus pacientes. Por ahora solo administras el catálogo — el cobro se habilita en una fase posterior.
        </p>
      </div>

      {!editing && (
        <div className="flex gap-1.5 mb-5 bg-muted/50 rounded-xl p-1 w-fit">
          <button
            onClick={() => setTab("mine")}
            className={`text-sm font-medium px-3.5 py-1.5 rounded-lg transition-colors ${tab === "mine" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
          >
            Tus productos ({products.length})
          </button>
          <button
            onClick={() => setTab("library")}
            className={`text-sm font-medium px-3.5 py-1.5 rounded-lg transition-colors ${tab === "library" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
          >
            Biblioteca de guías ({guides.length})
          </button>
        </div>
      )}

      {editing ? (
        <div className="bg-card rounded-2xl border border-border/50 p-5">
          <h2 className="font-heading font-bold text-base text-foreground mb-4">
            {editing === "new" ? "Nuevo producto" : "Editar producto"}
          </h2>
          <ProductForm
            doctorId={specialist.id}
            product={editing === "new" ? null : editing}
            onSaved={() => { setEditing(null); loadProducts(specialist.id); }}
            onCancel={() => setEditing(null)}
          />
        </div>
      ) : tab === "library" ? (
        <>
          <p className="text-sm text-muted-foreground mb-4">
            Guías que BuscoUnDoctor preparó para tu especialidad ({specialist.specialty || "sin especialidad"}). Agrégalas a tu catálogo y ajusta precio o descripción antes de activarlas.
          </p>
          {guides.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl">
              <BookOpen className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Todavía no hay guías disponibles para tu especialidad.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {guides.map((g) => {
                const added = addedGuideIds.has(g.id);
                return (
                  <div key={g.id} className="bg-card rounded-2xl border border-border/50 p-4 flex gap-4">
                    <div className="w-24 flex-shrink-0">
                      <ProductCardPreview product={g} />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col">
                      <p className="font-heading font-semibold text-sm text-foreground line-clamp-1">{g.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{g.description || "Sin descripción"}</p>
                      <p className="text-xs text-foreground mt-1">
                        {g.price != null ? `Sugerido: $${Number(g.price).toLocaleString("es-MX")} MXN` : "Sin precio sugerido"}
                      </p>
                      <div className="mt-auto pt-3">
                        {added ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Ya la agregaste
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            className="rounded-lg h-7 px-2.5 text-xs"
                            disabled={addingGuideId === g.id}
                            onClick={() => addFromLibrary(g)}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            {addingGuideId === g.id ? "Agregando..." : "Agregar a mi tienda"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex justify-end items-center mb-4">
            <Button className="rounded-xl" onClick={() => setEditing("new")}>
              <Plus className="w-4 h-4" />
              Nuevo producto
            </Button>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl">
              <Package className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Aún no tienes productos digitales.</p>
              <Button className="mt-4 rounded-xl" onClick={() => setEditing("new")}>
                <Plus className="w-4 h-4" />
                Crear mi primer producto
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {products.map((p) => {
                const meta = STATUS_META[p.status] || STATUS_META.draft;
                return (
                  <div key={p.id} className="bg-card rounded-2xl border border-border/50 p-4 flex gap-4">
                    <div className="w-24 flex-shrink-0">
                      <ProductCardPreview product={p} />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${meta.cls}`}>{meta.label}</span>
                        <span className="font-heading font-bold text-sm text-foreground">
                          {p.price != null ? `$${Number(p.price).toLocaleString("es-MX")} MXN` : "—"}
                        </span>
                      </div>
                      <p className="font-heading font-semibold text-sm text-foreground mt-1 line-clamp-1">{p.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{p.description || "Sin descripción"}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <FileText className="w-3 h-3" />
                        PDF
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-auto pt-3">
                        <Button size="sm" variant="outline" className="rounded-lg h-7 px-2 text-xs" onClick={() => setEditing(p)}>
                          <Pencil className="w-3 h-3" /> Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-lg h-7 px-2 text-xs"
                          onClick={() => toggleStatus(p)}
                          disabled={p.status === "draft"}
                          title={p.status === "draft" ? "Sube el PDF y edita para activar" : ""}
                        >
                          {p.status === "active" ? "Desactivar" : "Activar"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-lg h-7 px-2 text-xs text-destructive hover:text-destructive"
                          onClick={() => remove(p)}
                          disabled={deletingId === p.id}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-8 p-4 rounded-xl bg-blue-50 border border-blue-100">
            <p className="text-xs text-blue-900/80">
              <strong>Nota:</strong> el estatus "Activo" significa "listo para vender cuando exista el checkout". Aún no se puede comprar ni descargar — eso llega con la fase de pagos.
            </p>
          </div>
        </>
      )}
    </div>
  );
}