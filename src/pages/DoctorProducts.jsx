import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { ArrowLeft, Stethoscope, Globe, Plus, Pencil, Trash2, FileText, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProductForm from "@/components/products/ProductForm";
import ProductCardPreview from "@/components/products/ProductCardPreview";

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
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-40 bg-brand-navy px-4 py-3 flex items-center justify-between">
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