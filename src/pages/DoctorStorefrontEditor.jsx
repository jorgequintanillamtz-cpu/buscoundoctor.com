import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import {
  ArrowLeft,
  Stethoscope,
  Globe,
  Sparkles,
  Plus,
  Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import StorefrontView from "@/components/storefront/StorefrontView";
import StorefrontSettingsForm from "@/components/storefront/editor/StorefrontSettingsForm";
import SimpleListEditor from "@/components/storefront/editor/SimpleListEditor";
import StorefrontInsurerPicker from "@/components/storefront/editor/StorefrontInsurerPicker";
import TimelineEditor from "@/components/storefront/editor/TimelineEditor";
import FaqEditor from "@/components/storefront/editor/FaqEditor";
import LocationEditor from "@/components/storefront/editor/LocationEditor";
import SectionOrderEditor from "@/components/storefront/editor/SectionOrderEditor";
import StorefrontStyleEditor from "@/components/storefront/editor/StorefrontStyleEditor";
import GuideLibraryStrip from "@/components/products/GuideLibraryStrip";
import { generateUniqueSlug, byPosition } from "@/lib/storefrontUtils";
import { DEFAULT_SECTION_ORDER } from "@/lib/storefrontSections";
import DoctorPanelSidebar from "@/components/admin/DoctorPanelSidebar";

export default function DoctorStorefrontEditor() {
  const [status, setStatus] = useState("loading"); // loading | no-profile | no-storefront | ready
  const [specialist, setSpecialist] = useState(null);
  const [storefront, setStorefront] = useState(null);
  const [conditions, setConditions] = useState([]);
  const [insurances, setInsurances] = useState([]);
  const [locations, setLocations] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [products, setProducts] = useState([]); // solo activos, para la vista previa pública
  const [allProducts, setAllProducts] = useState([]); // todos (incluye borrador), para la biblioteca de guías
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showStyleEditor, setShowStyleEditor] = useState(false);
  const styleEditorDesktopRef = useRef(null);
  const styleEditorMobileRef = useRef(null);

  // Al abrir el panel, lleva la vista hasta él -- dentro del contenedor con
  // scroll propio que le corresponda (desktop o móvil), no de toda la página.
  useEffect(() => {
    if (!showStyleEditor) return;
    const t = setTimeout(() => {
      styleEditorDesktopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      styleEditorMobileRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
    return () => clearTimeout(t);
  }, [showStyleEditor]);

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
      const sp = own[0];
      setSpecialist(sp);
      const sf = await base44.entities.DoctorStorefront.filter({ doctor_id: sp.id }).catch(() => []);
      if (!active) return;
      if (sf.length > 0) {
        const s = sf[0];
        setStorefront({ ...s, section_order: s.section_order && s.section_order.length ? s.section_order : [...DEFAULT_SECTION_ORDER] });
        await loadChildren(s.id, sp.id);
        setStatus("ready");
      } else {
        setStatus("no-storefront");
      }
    })();
    return () => { active = false; };
  }, []);

  const loadChildren = async (sfId, specialistId) => {
    const [c, i, l, t, f, p, ap] = await Promise.all([
      base44.entities.StorefrontCondition.filter({ storefront_id: sfId }).catch(() => []),
      base44.entities.StorefrontInsurance.filter({ storefront_id: sfId }).catch(() => []),
      base44.entities.StorefrontLocation.filter({ storefront_id: sfId }).catch(() => []),
      base44.entities.StorefrontTimelineEntry.filter({ storefront_id: sfId }).catch(() => []),
      base44.entities.StorefrontFAQ.filter({ storefront_id: sfId }).catch(() => []),
      specialistId
        ? base44.entities.DoctorProduct.filter({ doctor_id: specialistId, status: "active" }).catch(() => [])
        : Promise.resolve([]),
      specialistId
        ? base44.entities.DoctorProduct.filter({ doctor_id: specialistId }).catch(() => [])
        : Promise.resolve([]),
    ]);
    setConditions(c.sort(byPosition));
    setInsurances(i.sort(byPosition));
    setLocations(l.sort(byPosition));
    setTimeline(t.sort(byPosition));
    setFaqs(f.sort(byPosition));
    setProducts(p);
    setAllProducts(ap);
  };

  const createStorefront = async () => {
    setCreating(true);
    try {
      const slug = await generateUniqueSlug(specialist.full_name);
      const s = await base44.entities.DoctorStorefront.create({
        doctor_id: specialist.id,
        slug,
        whatsapp_phone: specialist.whatsapp || "",
        status: "active",
      });
      setStorefront(s);
      setStatus("ready");
      toast.success("Tu página pública fue creada");
    } catch (e) {
      toast.error("Error al crear: " + e.message);
    }
    setCreating(false);
  };

  const updateStorefront = useCallback(async (values) => {
    setStorefront((prev) => ({ ...prev, ...values }));
  }, []);

  // Prellenados desde el perfil real: copian una sola vez (no sincronizan)
  // hacia las tablas propias del storefront, para que el doctor tenga un
  // punto de partida y de ahí en adelante las edite independientes de su
  // perfil del directorio. Cada uno se ofrece solo mientras la sección
  // correspondiente del storefront está vacía.
  const prefillConditions = async () => {
    const ids = specialist.conditions_relation || [];
    if (ids.length === 0) {
      toast.error("Tu perfil no tiene enfermedades capturadas todavía");
      return;
    }
    const all = await base44.entities.Condition.filter({});
    const names = all.filter((c) => ids.includes(c.id)).map((c) => c.name);
    const created = await Promise.all(
      names.map((name, i) => base44.entities.StorefrontCondition.create({ storefront_id: storefront.id, text: name, position: i }))
    );
    setConditions(created);
  };

  const prefillLocation = async () => {
    const offices = await base44.entities.Office.filter({ specialist_id: specialist.id }).catch(() => []);
    if (offices.length === 0) {
      toast.error("Tu perfil no tiene consultorios capturados todavía");
      return;
    }
    const office = offices.find((o) => o.is_primary) || offices[0];
    const created = await base44.entities.StorefrontLocation.create({
      storefront_id: storefront.id,
      place_name: office.name || "",
      address: office.address_line || "",
      maps_url: office.maps_url || "",
      latitude: office.latitude ?? null,
      longitude: office.longitude ?? null,
      position: 0,
    });
    setLocations([created]);
  };

  const saveToDb = useCallback(async () => {
    if (!storefront) return;
    setSaving(true);
    try {
      const { id, ...values } = storefront;
      const updated = await base44.entities.DoctorStorefront.update(storefront.id, {
        whatsapp_phone: values.whatsapp_phone,
        whatsapp_message: values.whatsapp_message,
        headline: values.headline,
        cover_photo: values.cover_photo,
        bg_color: values.bg_color,
        accent_color: values.accent_color,
        font_family: values.font_family,
        text_color: values.text_color,
        status: values.status,
        section_order: values.section_order || [...DEFAULT_SECTION_ORDER],
      });
      setStorefront(updated);
      toast.success("Cambios guardados");
    } catch (e) {
      toast.error("Error al guardar: " + e.message);
    }
    setSaving(false);
  }, [storefront]);

  // Autoguardar al cambiar campos principales (debounce simple)
  useEffect(() => {
    if (!storefront || !storefront.id) return;
    const t = setTimeout(() => {
      (async () => {
        try {
          await base44.entities.DoctorStorefront.update(storefront.id, {
            whatsapp_phone: storefront.whatsapp_phone,
            whatsapp_message: storefront.whatsapp_message,
            headline: storefront.headline,
            cover_photo: storefront.cover_photo,
            bg_color: storefront.bg_color,
            accent_color: storefront.accent_color,
            font_family: storefront.font_family,
            text_color: storefront.text_color,
            status: storefront.status,
            section_order: storefront.section_order || [...DEFAULT_SECTION_ORDER],
          });
        } catch {}
      })();
    }, 1200);
    return () => clearTimeout(t);
    }, [storefront?.whatsapp_phone, storefront?.whatsapp_message, storefront?.headline, storefront?.cover_photo, storefront?.bg_color, storefront?.accent_color, storefront?.font_family, storefront?.text_color, storefront?.status, storefront?.section_order]);

  const shell = (content) => (
    <div className="min-h-screen bg-background flex">
      <DoctorPanelSidebar activePath="/panel-medico/storefront" completitud={specialist?.completeness_score ?? null} />
      <div className="flex-1 min-w-0">
        <div className="lg:hidden sticky top-0 z-40 bg-brand-navy px-4 py-3 flex items-center justify-between">
          <Link to="/panel-medico" className="flex items-center gap-2 text-sm text-white/70 hover:text-white">
            <ArrowLeft className="w-4 h-4" />
            Volver al panel
          </Link>
          <h1 className="font-heading font-bold text-white text-sm flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Mi página pública
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
        <p className="text-sm text-muted-foreground mt-2">Regístrate primero para poder crear tu página pública.</p>
        <Button className="mt-5 rounded-xl" asChild>
          <Link to="/registro-medico">Registrarme como médico</Link>
        </Button>
      </div>
    );
  }

  if (status === "no-storefront") {
    return shell(
      <div className="max-w-md mx-auto text-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
          <Globe className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="font-heading font-bold text-xl text-foreground">Crea tu página pública</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
          Una mini página web personal que puedes poner en tu bio de Instagram. Tus pacientes te verán y te escribirán directo por WhatsApp.
        </p>
        <Button className="mt-6 rounded-xl" onClick={createStorefront} disabled={creating}>
          {creating ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          Crear mi página pública
        </Button>
      </div>
    );
  }

  return shell(
    <div className="max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
        {/* Columna de edición */}
        <div className="space-y-6">
          <div className="bg-card rounded-2xl border border-border/50 p-5">
            <StorefrontSettingsForm
              storefront={storefront}
              specialist={specialist}
              onChange={updateStorefront}
            />
          </div>

          <div className="bg-card rounded-2xl border border-border/50 p-5">
            <SimpleListEditor
              storefrontId={storefront.id}
              entityName="StorefrontCondition"
              field="text"
              label="Qué atiende"
              placeholder="Ej. Hipertensión"
              items={conditions}
              setItems={setConditions}
              onPrefill={prefillConditions}
            />
          </div>

          <div className="bg-card rounded-2xl border border-border/50 p-5">
            <GuideLibraryStrip
              specialistId={specialist.id}
              specialty={specialist.specialty}
              products={allProducts}
              onAdded={(created) => setAllProducts((prev) => [created, ...prev])}
              createOwnHref="/panel-medico/productos"
              title="Guías y productos digitales"
            />
          </div>

          <div className="bg-card rounded-2xl border border-border/50 p-5">
            <StorefrontInsurerPicker
              storefrontId={storefront.id}
              items={insurances}
              setItems={setInsurances}
              specialistInsurerIds={specialist.insurers_relation || []}
            />
          </div>

          <div className="bg-card rounded-2xl border border-border/50 p-5">
            <LocationEditor
              storefrontId={storefront.id}
              items={locations}
              setItems={setLocations}
              onPrefill={prefillLocation}
            />
          </div>

          <div className="bg-card rounded-2xl border border-border/50 p-5">
            <TimelineEditor
              storefrontId={storefront.id}
              items={timeline}
              setItems={setTimeline}
            />
          </div>

          <div className="bg-card rounded-2xl border border-border/50 p-5">
            <FaqEditor
              storefrontId={storefront.id}
              items={faqs}
              setItems={setFaqs}
            />
          </div>

          <div className="bg-card rounded-2xl border border-border/50 p-5">
            <SectionOrderEditor
              order={storefront.section_order || []}
              onChange={(next) => updateStorefront({ section_order: next })}
            />
          </div>
        </div>

        {/* Columna de preview (sticky en desktop, con su propio scroll
            interno -- independiente del scroll de la columna de edición, así
            abrir "Editar estilo" no obliga a bajar por todo el formulario). */}
        <div className="hidden lg:block">
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-1">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Vista previa
              </p>
              <Button size="sm" className="rounded-lg h-7 px-2.5 text-xs gap-1.5 bg-brand-blue hover:bg-brand-blue/90 text-white" onClick={() => setShowStyleEditor((v) => !v)}>
                <Palette className="w-3.5 h-3.5" />
                Editar estilo
              </Button>
            </div>
            <div className="rounded-[2rem] border-8 border-gray-800 overflow-hidden shadow-2xl">
              <div className="h-[600px] overflow-y-auto">
                <StorefrontView
                  storefront={storefront}
                  specialist={specialist}
                  conditions={conditions}
                  insurances={insurances}
                  locations={locations}
                  timeline={timeline}
                  faqs={faqs}
                  products={products}
                  embedded
                />
              </div>
            </div>
            {showStyleEditor && (
              <div ref={styleEditorDesktopRef}>
                <StorefrontStyleEditor storefront={storefront} onChange={updateStorefront} />
              </div>
            )}
          </div>
        </div>

        {/* Preview en móvil (debajo de todo) */}
        <div className="lg:hidden">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Vista previa
            </p>
            <Button size="sm" className="rounded-lg h-7 px-2.5 text-xs gap-1.5 bg-brand-blue hover:bg-brand-blue/90 text-white" onClick={() => setShowStyleEditor((v) => !v)}>
              <Palette className="w-3.5 h-3.5" />
              Editar estilo
            </Button>
          </div>
          <div className="rounded-2xl border-4 border-gray-800 overflow-hidden shadow-xl">
            <div className="h-[500px] overflow-y-auto">
              <StorefrontView
                storefront={storefront}
                specialist={specialist}
                conditions={conditions}
                insurances={insurances}
                locations={locations}
                timeline={timeline}
                faqs={faqs}
                products={products}
                embedded
                />
            </div>
          </div>
          {showStyleEditor && (
            <div ref={styleEditorMobileRef}>
              <StorefrontStyleEditor storefront={storefront} onChange={updateStorefront} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}