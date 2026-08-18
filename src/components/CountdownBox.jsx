// Caja de un solo dígito del countdown de lanzamiento (días/horas/min/seg).
// `compact` reduce el tamaño para usos inline (ej. dentro de una tarjeta),
// vs el tamaño grande de la landing /para-medicos.
export default function CountdownBox({ value, label, compact = false }) {
  if (compact) {
    return (
      <div className="bg-brand-blue rounded-lg px-2 py-1.5 text-center min-w-[46px]">
        <p className="font-heading font-bold text-base text-white tabular-nums leading-none">
          {String(value).padStart(2, "0")}
        </p>
        <p className="text-[9px] text-white/85 mt-1 uppercase tracking-wide font-semibold">{label}</p>
      </div>
    );
  }
  return (
    <div className="bg-brand-blue rounded-2xl px-3 py-2.5 sm:px-5 sm:py-4 text-center min-w-[68px] sm:min-w-[92px] shadow-md shadow-brand-blue/20">
      <p className="font-heading font-extrabold text-3xl sm:text-5xl text-white tabular-nums leading-none">
        {String(value).padStart(2, "0")}
      </p>
      <p className="text-[10px] sm:text-xs text-white/85 mt-1.5 uppercase tracking-wide font-bold">{label}</p>
    </div>
  );
}
