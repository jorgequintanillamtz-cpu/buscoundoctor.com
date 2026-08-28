import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

// Cache compartida entre todos los componentes: el banco de especialidades
// cambia poco, así que se carga una sola vez por sesión de navegación en
// vez de que cada tarjeta/página haga su propio fetch.
let _cache = null; // { [nombre formal]: nombre "como lo busca el paciente" }
let _pending = null;
const _listeners = new Set();

async function loadSpecialtyDisplayMap() {
  if (_cache) return _cache;
  if (!_pending) {
    _pending = base44.entities.Specialty.filter({ active: true })
      .then((list) => {
        const map = {};
        list.forEach((s) => {
          map[s.name] = s.display_name || s.name;
        });
        _cache = map;
        _listeners.forEach((fn) => fn());
        return map;
      })
      .catch(() => ({}));
  }
  return _pending;
}

// Hook: dado el nombre formal médico de una especialidad (ej. "Ginecología"),
// devuelve cómo la busca un paciente en internet (ej. "Ginecólogo"), estilo
// Doctoralia. Mientras carga el banco, regresa el nombre formal como
// respaldo para no dejar la UI en blanco.
export function useSpecialtyDisplay(specialtyName) {
  const [, forceRender] = useState(0);
  useEffect(() => {
    if (_cache) return;
    const listener = () => forceRender((n) => n + 1);
    _listeners.add(listener);
    loadSpecialtyDisplayMap();
    return () => _listeners.delete(listener);
  }, []);
  if (!specialtyName) return specialtyName;
  return _cache?.[specialtyName] || specialtyName;
}

// Hook para cuando se necesita el mapa completo (ej. resolver nombres
// dentro de un .map() sin poder llamar un hook por cada item — llamar hooks
// dentro de un loop/callback violaría las reglas de hooks de React). Se usa
// una sola vez en el componente contenedor y luego se lee el objeto plano.
export function useSpecialtyDisplayMap() {
  const [, forceRender] = useState(0);
  useEffect(() => {
    if (_cache) return;
    const listener = () => forceRender((n) => n + 1);
    _listeners.add(listener);
    loadSpecialtyDisplayMap();
    return () => _listeners.delete(listener);
  }, []);
  return _cache || {};
}

// Versión no-hook para usar fuera de componentes React o cuando ya se tiene
// la lista de especialidades cargada localmente.
export function resolveSpecialtyDisplay(specialtyName, specialties = []) {
  if (!specialtyName) return specialtyName;
  const match = specialties.find((s) => s.name === specialtyName);
  return match?.display_name || specialtyName;
}
