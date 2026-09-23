import { ESTADOS_FLUJO } from "../types";
import type { Oportunidad } from "../types";

/**
 * Calcula, para cada etapa del flujo principal, cuántas oportunidades
 * llegaron al menos hasta esa etapa (o la superaron). Las oportunidades
 * en estados alternos (Perdido, No convertido, Postergado, Cancelado)
 * salieron del embudo y no se cuentan en las etapas siguientes.
 * Este cálculo es intencionalmente simple para el MVP; el análisis
 * histórico más detallado (con datos importados de 12 meses) queda
 * para una fase posterior, tal como se definió en el alcance.
 */
function calcularEmbudo(oportunidades: Oportunidad[]) {
  return ESTADOS_FLUJO.map((estado, i) => {
    const valor = oportunidades.filter((o) => {
      const idxActual = ESTADOS_FLUJO.indexOf(o.estado as any);
      return idxActual >= i;
    }).length;
    return { estado, valor };
  });
}

export function Funnel({ oportunidades }: { oportunidades: Oportunidad[] }) {
  const data = calcularEmbudo(oportunidades);
  const max = data[0]?.valor || 1;

  return (
    <div className="ef-card p-5">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="ef-serif text-lg font-medium">Embudo de conversión</h3>
        <span className="text-xs text-[color:var(--slate-500)]">Oportunidades actuales</span>
      </div>
      <div className="flex flex-col gap-2">
        {data.map((step, i) => {
          const pct = max ? Math.round((step.valor / max) * 100) : 0;
          const dropFromPrev =
            i === 0 || !data[i - 1].valor
              ? null
              : Math.round(100 - (step.valor / data[i - 1].valor) * 100);
          return (
            <div key={step.estado} className="flex items-center gap-3">
              <div className="w-40 text-xs text-[color:var(--slate-700)] text-right shrink-0">
                {step.estado}
              </div>
              <div className="flex-1 h-7 bg-[color:var(--gray-soft)] rounded-sm relative overflow-hidden">
                <div
                  className="h-full rounded-sm flex items-center justify-end pr-2"
                  style={{
                    width: pct + "%",
                    background: i === data.length - 1 ? "var(--teal)" : "var(--green-700)",
                  }}
                >
                  <span className="ef-tabular text-xs font-semibold text-white">{step.valor}</span>
                </div>
              </div>
              <div className="w-14 text-xs text-[color:var(--brick)] text-right shrink-0">
                {dropFromPrev ? "-" + dropFromPrev + "%" : ""}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
