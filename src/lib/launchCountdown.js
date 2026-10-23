import { useState, useEffect } from "react";

// Lanzamiento público de la plataforma. Vive aquí -- no repetido en cada página -- para que
// /para-medicos, /registro-gratis, el inicio y las páginas de especialidades sin doctores
// todavía no puedan desincronizarse.
//
// 2026-10-23, a petición de Jorge: SIN FECHA EXACTA ("inicios de 2027"). Con LAUNCH_DATE = null
// no hay cuenta regresiva y los textos dicen LAUNCH_APPROX. Para volver a una fecha real basta
// poner aquí un Date (por ejemplo new Date("2027-01-15T00:00:00-06:00")): las cajas del
// contador, los "faltan N días" y los textos con fecha reaparecen solos.
export const LAUNCH_DATE = null;
export const LAUNCH_APPROX = "inicios de 2027";
export const HAS_LAUNCH_DATE = LAUNCH_DATE instanceof Date;

const longDate = HAS_LAUNCH_DATE
  ? LAUNCH_DATE.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Monterrey" })
  : "";

// Para textos corridos: "El directorio completo sale {LAUNCH_WHEN}" -> "a inicios de 2027" / "el 15 de enero de 2027".
export const LAUNCH_WHEN = HAS_LAUNCH_DATE ? `el ${longDate}` : `a ${LAUNCH_APPROX}`;

// Para las píldoras de las páginas de médicos: "Inauguración: inicios de 2027" / "Lanzamos el 15 de enero de 2027".
export const LAUNCH_PILL = HAS_LAUNCH_DATE ? `Lanzamos el ${longDate}` : `Inauguración: ${LAUNCH_APPROX}`;

// Cuenta regresiva en vivo hasta `target`, actualizada cada segundo. Sin fecha (`null`) no cuenta:
// regresa ceros y `done: false` (las páginas no dibujan las cajas si no hay fecha, ver HAS_LAUNCH_DATE).
export function useCountdown(target) {
  const calc = () => (target ? Math.max(0, target.getTime() - Date.now()) : 0);
  const [timeLeft, setTimeLeft] = useState(calc);

  useEffect(() => {
    if (!target) return undefined;
    const id = setInterval(() => {
      setTimeLeft(Math.max(0, target.getTime() - Date.now()));
    }, 1000);
    return () => clearInterval(id);
  }, [target]);

  const totalSeconds = Math.floor(timeLeft / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    done: target ? timeLeft <= 0 : false,
  };
}
