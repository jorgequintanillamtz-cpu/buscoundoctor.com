// Reglas de contraseña para quien crea su cuenta con correo (registro,
// "olvidé mi contraseña" y cambio de contraseña en Ajustes). Decididas con
// Jorge: pocas, claras y sin símbolos obligatorios (a muchos médicos les
// estorban y casi no suman seguridad). NO aplican a Google/Microsoft: ahí no
// hay contraseña de BuscoUnDoctor.
//
// OJO: estas reglas viven en el navegador y solo guían a la persona. Para que
// valgan de verdad hay que activar la misma política en Supabase →
// Authentication (largo mínimo y tipos de caracteres); ver CLAUDE.md §7.
export const MIN_PASSWORD_LENGTH = 10;

// Contraseñas muy comunes (se comparan en minúsculas).
const COMMON_PASSWORDS = new Set([
  "password", "password1", "password12", "password123", "contrasena", "contraseña", "contrasena1", "contrasena123",
  "123456789", "1234567890", "12345678", "123456789a", "qwertyuiop", "qwerty123", "qwerty1234", "abc123456",
  "abcd1234", "abcd12345", "admin1234", "administrador", "iloveyou", "welcome123", "letmein123", "monterrey123",
  "doctor123", "doctora123", "medico123", "medica123", "buscoundoctor", "buscoundoctor1", "buscoundoctor123",
]);

// Palabras que, aunque les agreguen números o símbolos, siguen siendo adivinables.
const WEAK_WORDS = ["password", "contrasena", "qwerty", "admin", "doctor", "doctora", "medico", "medica", "buscoundoctor", "monterrey", "welcome", "iloveyou", "letmein"];

const normalizeWord = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

function isCommonOrEmail(password, email) {
  const pw = normalizeWord(password);
  if (COMMON_PASSWORDS.has(pw)) return true;
  const lettersOnly = pw.replace(/[^a-z]/g, "");
  if (WEAK_WORDS.includes(lettersOnly)) return true;
  if (new Set(pw).size < 4) return true; // "aaaaaaaaaaA1": casi un solo carácter repetido
  const mail = normalizeWord(email || "");
  if (mail) {
    if (pw === mail) return true;
    const local = mail.split("@")[0];
    if (local.length >= 4 && pw.includes(local)) return true;
  }
  return false;
}

// Devuelve cada regla con si se cumple, si todo está bien y un nivel de
// seguridad para la barra ("debil" | "casi" | "segura" | "muy-segura").
export function checkPassword(password = "", email = "") {
  const checks = [
    { key: "length", label: `Al menos ${MIN_PASSWORD_LENGTH} caracteres`, ok: password.length >= MIN_PASSWORD_LENGTH },
    { key: "upper", label: "Una letra mayúscula", ok: /[A-ZÁÉÍÓÚÑÜ]/.test(password) },
    { key: "lower", label: "Una letra minúscula", ok: /[a-záéíóúñü]/.test(password) },
    { key: "number", label: "Un número", ok: /\d/.test(password) },
    { key: "common", label: "No es tu correo ni una contraseña común", ok: password.length > 0 && !isCommonOrEmail(password, email) },
  ];
  const passed = checks.filter((c) => c.ok).length;
  const valid = passed === checks.length;
  let level = "debil";
  if (valid) level = password.length >= 14 ? "muy-segura" : "segura";
  else if (passed >= 3) level = "casi";
  return { checks, valid, level };
}

// Mensaje corto con la primera regla que falta (para errores al enviar).
export function passwordProblem(password, email) {
  const { checks, valid } = checkPassword(password, email);
  if (valid) return "";
  const first = checks.find((c) => !c.ok);
  return `Tu contraseña no cumple todo: ${first.label.charAt(0).toLowerCase()}${first.label.slice(1)}.`;
}
