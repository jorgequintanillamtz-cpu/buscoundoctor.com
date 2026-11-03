// Prellenado del registro cuando un doctor llega desde la página de un doctor recomendado por pacientes
// (/registro-medico?doctor=<slug>, CLAUDE.md §8r Paso 54). Convierte lo que ya sabemos de él en campos del asistente.
// SOLO usa datos que esa página ya muestra al público (nombre, especialidad, subespecialidad, zona, hospital, cédula): el
// teléfono para citas que dio un paciente y cualquier correo NUNCA llegan al navegador, a propósito.
const normalize = (t) => (t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

// `doc` = respuesta de get_recommended_doctor. `catalogs` = { specialties, subspecialties, zones, hospitals } (los mismos del asistente).
export function buildPrefillFromRecommended(doc, { specialties = [], subspecialties = [], zones = [], hospitals = [] } = {}) {
  const out = {};
  const name = String(doc?.full_name || "").trim();
  const m = name.match(/^(dr\.?|dra\.?|doctor|doctora)\s+(.+)$/i);
  if (m) {
    out.title = /^dra|^doctora/i.test(m[1]) ? "Dra." : "Dr.";
    out.full_name = m[2].trim();
  } else if (name) {
    out.full_name = name;
  }

  const spec = specialties.find((s) => normalize(s.name) === normalize(doc?.specialty));
  if (spec) out.specialty = spec.name;
  else if (doc?.specialty) out.specialty = doc.specialty; // el asistente la muestra como "Otra (no está en la lista)"

  if (spec && doc?.subspecialty) {
    const sub = subspecialties.find((s) => s.parent_specialty_id === spec.id && normalize(s.name) === normalize(doc.subspecialty));
    if (sub) out.subspecialties_relation = [sub.id];
  }

  const license = String(doc?.license || "").replace(/\D/g, "");
  if (license) out.cedula = license;

  const zone = zones.find((z) => normalize(z.name) === normalize(doc?.zone));
  if (zone) out.zone = zone.name;

  // Hospital: solo si coincide con uno del catálogo (nombre o nombre alterno); entonces se llena la dirección igual que al elegirlo a mano.
  const h = normalize(doc?.hospital);
  if (h.length >= 5) {
    const hospital = hospitals.find((x) => [x.name, ...(Array.isArray(x.aliases) ? x.aliases : [])].some((n) => {
      const nn = normalize(n);
      return nn && (nn === h || nn.includes(h) || h.includes(nn));
    }));
    if (hospital) {
      out.hospital_id = hospital.id;
      out.hospital_name = hospital.name;
      out.address_street = hospital.address_street || "";
      out.address_ext_number = hospital.address_ext_number || "";
      out.address_neighborhood = hospital.address_neighborhood || "";
      out.address_postal_code = hospital.address_postal_code || "";
      out.address_lat = hospital.latitude ?? null;
      out.address_lng = hospital.longitude ?? null;
      out.address_place_id = hospital.place_id || null;
      const hz = zones.find((z) => z.id === hospital.zone_id);
      if (hz) out.zone = hz.name;
    }
  }
  return out;
}

// Mezcla el prellenado SOLO en los campos que siguen vacíos (lo que la persona ya escribió o recuperó de un borrador manda).
export function fillEmptyFields(prev, fill) {
  const next = { ...prev };
  for (const [k, v] of Object.entries(fill)) {
    const cur = prev[k];
    const empty = cur == null || cur === "" || (Array.isArray(cur) && cur.length === 0);
    if (empty && v != null && v !== "") next[k] = v;
  }
  return next;
}
