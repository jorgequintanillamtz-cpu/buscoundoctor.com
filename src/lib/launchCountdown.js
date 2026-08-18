import { useState, useEffect } from "react";

// Fecha de lanzamiento público de la plataforma (hora de Monterrey, UTC-6).
// Vive aquí -- no repetida en cada página -- para que /para-medicos y
// cualquier otra página con countdown (ej. especialidades sin doctores
// todavía) no puedan desincronizarse si la fecha cambia.
export const LAUNCH_DATE = new Date("2026-10-15T00:00:00-06:00");

// Cuenta regresiva en vivo hasta `target`, actualizada cada segundo.
export function useCountdown(target) {
  const [timeLeft, setTimeLeft] = useState(() => Math.max(0, target.getTime() - Date.now()));

  useEffect(() => {
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
    done: timeLeft <= 0,
  };
}
