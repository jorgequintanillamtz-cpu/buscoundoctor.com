import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { ArrowLeft, Stethoscope, Plus, Pencil, Trash2, FileText, Package, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProductForm from "@/components/products/ProductForm";
import GuideLibraryStrip from "@/components/products/GuideLibraryStrip";
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
  const [savingPriceId, setSavingPriceId] = useState(null); // id del producto cuyo precio se está guardando, o null

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
      await loadProducts(own[0].id);
      setStatus("ready");
    })();
    return () => { active = false; };
  }, []);

  const loadProducts = async (doctorId) => {
    const list = await base44.entities.DoctorProduct.filter({ doctor_id: doctorId }, "-created_date", 50).catch(() => []);
    setProducts(list);
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

  // Edita el precio directo en la tarjeta, sin abrir el formulario completo.
  // Los inputs siempre están habilitados; al salir del campo (blur) se guarda
  // solo si algo cambió, para no mandar un update por cada tecla.
  const setPriceField = (id, field, value) => {
    setProducts((prev) => prev.map((x) => (x.id === id ? { ...x, [field]: value } : x)));
  };

  const commitPriceField = async (p) => {
    const price = p.price === "" || p.price == null ? null : Number(p.price);
    const compareAtPrice = p.compare_at_price === "" || p.compare_at_price == null ? null : Number(p.compare_at_price);
    if (compareAtPrice != null && price != null && compareAtPrice <= price) {
      toast.error("El precio de comparación debe ser mayor al precio actual");
      return;
    }
    setSavingPriceId(p.id);
    try {
      await base44.entities.DoctorProduct.update(p.id, { price, compare_at_price: compareAtPrice });
      setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, price, compare_at_price: compareAtPrice } : x)));
    } catch (e) {
      toast.error("Error al guardar el precio: " + e.message);
    }
    setSavingPriceId(null);
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
        <GuideLibraryStrip
          specialistId={specialist.id}
          specialty={specialist.specialty}
          products={products}
          onAdded={(created) => { setProducts((prev) => [created, ...prev]); setEditing(created); }}
        />
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
      ) : (
        <>
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-heading font-bold text-base text-foreground">Tus productos ({products.length})</h2>
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
                const cover = (Array.isArray(p.images) && p.images[0]) || p.cover_image || null;
                return (
                  <div key={p.id} className="bg-card rounded-2xl border border-border/50 p-4 flex gap-4">
                    <div className="relative w-32 h-44 flex-shrink-0 rounded-lg bg-muted border border-border/50 overflow-hidden shadow-sm">
                      {cover ? (
                        <img src={cover} alt={p.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FileText className="w-8 h-8 text-muted-foreground/50" />
                        </div>
                      )}
                      {p.source_guide_id && (
                        <span className="absolute top-1.5 right-1.5 bg-emerald-500 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-full shadow-sm">
                          Agregado
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${meta.cls}`}>{meta.label}</span>
                        {savingPriceId === p.id && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
                      </div>

                      <div className="flex items-end gap-2 mt-2 mb-1">
                        <div className="flex-1">
                          <label className="text-[10px] font-medium text-muted-foreground block mb-0.5">Precio</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={p.price ?? ""}
                            onChange={(e) => setPriceField(p.id, "price", e.target.value)}
                            onBlur={() => commitPriceField(p)}
                            className="w-full h-8 text-sm border border-input rounded-lg px-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                            placeholder="199"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] font-medium text-muted-foreground block mb-0.5">Precio tachado</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={p.compare_at_price ?? ""}
                            onChange={(e) => setPriceField(p.id, "compare_at_price", e.target.value)}
                            onBlur={() => commitPriceField(p)}
                            className="w-full h-8 text-sm border border-input rounded-lg px-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                            placeholder="299"
                          />
                        </div>
                      </div>
                      {p.compare_at_price != null && p.price != null && (
                        <p className="text-xs mb-1">
                          <span className="font-semibold text-emerald-600">${Number(p.price).toLocaleString("es-MX")} MXN</span>{" "}
                          <span className="text-muted-foreground line-through">${Number(p.compare_at_price).toLocaleString("es-MX")}</span>
                        </p>
                      )}
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
              <button
                type="button"
                onClick={() => setEditing("new")}
                className="bg-card rounded-2xl border-2 border-dashed border-border p-4 flex gap-4 items-center text-left hover:border-brand-blue hover:bg-accent/30 transition-colors"
              >
                <div className="w-32 h-44 flex-shrink-0 rounded-lg border-2 border-dashed border-border/70 flex items-center justify-center">
                  <Plus className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-heading font-semibold text-sm text-foreground">Crear producto</p>
                  <p className="text-xs text-muted-foreground mt-1">Sube un PDF nuevo y agrégalo a tu tienda.</p>
                </div>
              </button>
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