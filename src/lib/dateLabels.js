// Fechas "YYYY-MM-DD" (columnas tipo date) sin desfase de zona horaria.
export function parseDateOnly(value) {
  if (!value) return null;
  const [y, m, d] = String(value).slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatDateOnly(value) {
  const date = parseDateOnly(value);
  return date ? date.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" }) : "";
}

// "YYYY-MM-DD" de hoy + n días, en la hora local del navegador.
export function dateInputValue(daysFromToday) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
