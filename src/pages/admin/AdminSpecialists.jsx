import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const emptyForm = {
  full_name: "", slug: "", specialty: "", subspecialty: "", description: "",
  years_experience: "", location: "", city: "Monterrey", zone: "", address: "",
  whatsapp: "", email: "", modality: "presencial", schedule: "", services: [],
  certifications: "", featured: false, active: true, price_range: "$$",
};

export default function AdminSpecialists() {
  const [specialists, setSpecialists] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [servicesInput, setServicesInput] = useState("");

  const load = async () => {
    const [specs, specList, zoneList] = await Promise.all([
      base44.entities.Specialist.list("-created_date"),
      base44.entities.Specialty.filter({ active: true }),
      base44.entities.Zone.filter({ active: true }),
    ]);
    setSpecialists(specs);
    setSpecialties(specList);
    setZones(zoneList);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setServicesInput("");
    setDialogOpen(true);
  };

  const openEdit = (s) => {
    setEditing(s);
    setForm({
      full_name: s.full_name || "", slug: s.slug || "", specialty: s.specialty || "",
      subspecialty: s.subspecialty || "", description: s.description || "",
      years_experience: s.years_experience || "", location: s.location || "",
      city: s.city || "Monterrey", zone: s.zone || "", address: s.address || "",
      whatsapp: s.whatsapp || "", email: s.email || "", modality: s.modality || "presencial",
      schedule: s.schedule || "", services: s.services || [], certifications: s.certifications || "",
      featured: s.featured || false, active: s.active !== false, price_range: s.price_range || "$$",
    });
    setServicesInput((s.services || []).join(", "));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const data = {
      ...form,
      years_experience: form.years_experience ? Number(form.years_experience) : undefined,
      services: servicesInput.split(",").map(s => s.trim()).filter(Boolean),
      slug: form.slug || form.full_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    };

    if (editing) {
      await base44.entities.Specialist.update(editing.id, data);
      toast.success("Especialista actualizado");
    } else {
      await base44.entities.Specialist.create(data);
      toast.success("Especialista creado");
    }
    setDialogOpen(false);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar este especialista?")) return;
    await base44.entities.Specialist.delete(id);
    toast.success("Especialista eliminado");
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading font-bold text-2xl text-foreground">Especialistas</h1>
        <Button className="gap-2 rounded-xl" onClick={openCreate}>
          <Plus className="w-4 h-4" /> Agregar
        </Button>
      </div>

      <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nombre</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Especialidad</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Zona</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">WhatsApp</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Activo</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {specialists.map(s => (
                <tr key={s.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{s.full_name}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{s.specialty}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{s.zone}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{s.whatsapp}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block w-2 h-2 rounded-full ${s.active !== false ? 'bg-green-500' : 'bg-red-400'}`} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                        <Pencil className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">{editing ? "Editar" : "Nuevo"} Especialista</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Nombre completo *</label>
                <Input value={form.full_name} onChange={e => update("full_name", e.target.value)} className="rounded-xl" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Slug</label>
                <Input value={form.slug} onChange={e => update("slug", e.target.value)} placeholder="auto-generado" className="rounded-xl" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Especialidad *</label>
                <Select value={form.specialty} onValueChange={v => update("specialty", v)}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {specialties.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Subespecialidad</label>
                <Input value={form.subspecialty} onChange={e => update("subspecialty", e.target.value)} className="rounded-xl" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">WhatsApp *</label>
                <Input value={form.whatsapp} onChange={e => update("whatsapp", e.target.value)} placeholder="528112345678" className="rounded-xl" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Email</label>
                <Input value={form.email} onChange={e => update("email", e.target.value)} className="rounded-xl" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Años de experiencia</label>
                <Input type="number" value={form.years_experience} onChange={e => update("years_experience", e.target.value)} className="rounded-xl" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Modalidad</label>
                <Select value={form.modality} onValueChange={v => update("modality", v)}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="presencial">Presencial</SelectItem>
                    <SelectItem value="online">En línea</SelectItem>
                    <SelectItem value="ambas">Ambas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Zona</label>
                <Select value={form.zone} onValueChange={v => update("zone", v)}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {zones.map(z => <SelectItem key={z.id} value={z.name}>{z.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Precio</label>
                <Select value={form.price_range} onValueChange={v => update("price_range", v)}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="$">$ Económico</SelectItem>
                    <SelectItem value="$$">$$ Moderado</SelectItem>
                    <SelectItem value="$$$">$$$ Alto</SelectItem>
                    <SelectItem value="$$$$">$$$$ Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Dirección</label>
              <Input value={form.address} onChange={e => update("address", e.target.value)} className="rounded-xl" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Descripción</label>
              <Textarea value={form.description} onChange={e => update("description", e.target.value)} className="rounded-xl min-h-[80px]" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Horarios</label>
              <Input value={form.schedule} onChange={e => update("schedule", e.target.value)} placeholder="Lunes a Viernes: 9:00 - 18:00" className="rounded-xl" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Servicios (separados por coma)</label>
              <Input value={servicesInput} onChange={e => setServicesInput(e.target.value)} placeholder="Terapia, Consulta General, etc." className="rounded-xl" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Certificaciones</label>
              <Input value={form.certifications} onChange={e => update("certifications", e.target.value)} className="rounded-xl" />
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={form.active} onCheckedChange={v => update("active", v)} />
                <span className="text-sm">Activo</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.featured} onCheckedChange={v => update("featured", v)} />
                <span className="text-sm">Destacado</span>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">Cancelar</Button>
              <Button onClick={handleSave} className="rounded-xl">{editing ? "Guardar" : "Crear"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}