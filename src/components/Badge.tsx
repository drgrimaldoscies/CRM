const ESTILO: Record<string, { bg: string; fg: string }> = {
  "Indicación quirúrgica": { bg: "var(--gray-soft)", fg: "var(--slate-700)" },
  "Pendiente de cotización": { bg: "var(--orange-soft)", fg: "var(--orange)" },
  Cotizado: { bg: "var(--orange-soft)", fg: "var(--orange)" },
  "Presupuesto enviado": { bg: "#E5EDF5", fg: "var(--green-700)" },
  "En seguimiento": { bg: "#E5EDF5", fg: "var(--green-800)" },
  "Cirugía aceptada": { bg: "var(--teal-soft)", fg: "var(--teal)" },
  "Cirugía programada": { bg: "var(--teal-soft)", fg: "var(--teal)" },
  "Cirugía realizada": { bg: "var(--teal)", fg: "#FFFFFF" },
  "No convertido": { bg: "var(--gray-soft)", fg: "var(--slate-500)" },
  Perdido: { bg: "var(--brick-soft)", fg: "var(--brick)" },
  Postergado: { bg: "var(--orange-soft)", fg: "var(--orange)" },
  Cancelado: { bg: "var(--gray-soft)", fg: "var(--slate-500)" },
};

export function Badge({ estado }: { estado: string }) {
  const s = ESTILO[estado] || ESTILO["Indicación quirúrgica"];
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 rounded-sm text-xs font-semibold whitespace-nowrap"
      style={{ background: s.bg, color: s.fg }}
    >
      {estado}
    </span>
  );
}
