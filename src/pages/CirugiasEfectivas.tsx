import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { AppLayout } from "../components/AppLayout";
import { ESTADOS_COTIZACION } from "../types";
import type { CotizacionQuirurgica } from "../types";

function fmtFecha(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" });
}

const ESTADO_COLOR: Record<string, { bg: string; fg: string }> = {
  "Cirugía Realizada": { bg: "var(--teal-soft)", fg: "var(--teal)" },
  "Cirugía Programada": { bg: "var(--teal-soft)", fg: "var(--teal)" },
  "Con seguimiento": { bg: "#EAF0EC", fg: "var(--green-800)" },
  "Cirugía Postergada": { bg: "var(--orange-soft)", fg: "var(--orange)" },
  "No convertido": { bg: "var(--gray-soft)", fg: "var(--slate-500)" },
};

export function CirugiasEfectivas() {
  const [cotizaciones, setCotizaciones] = useState<CotizacionQuirurgica[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardandoId, setGuardandoId] = useState<string | null>(null);

  async function cargar() {
    setCargando(true);
    const { data } = await supabase
      .from("cotizaciones_quirurgicas")
      .select("*")
      .order("fecha", { ascending: false });
    if (data) setCotizaciones(data as CotizacionQuirurgica[]);
    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  async function actualizarEstado(id: string, estado: string) {
    setGuardandoId(id);
    setCotizaciones((prev) => prev.map((c) => (c.id === id ? { ...c, estado } : c)));
    await supabase.from("cotizaciones_quirurgicas").update({ estado }).eq("id", id);
    setGuardandoId(null);
  }

  return (
    <AppLayout title="Cirugías efectivas" subtitle="Estado actual de cada cirugía cotizada">
      <div className="ef-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[color:var(--slate-500)] border-b border-[color:var(--line)]">
                <th className="py-3 px-4 font-medium">N° Cotización</th>
                <th className="py-3 px-4 font-medium">Fecha</th>
                <th className="py-3 px-4 font-medium">Paciente</th>
                <th className="py-3 px-4 font-medium">Código cliente</th>
                <th className="py-3 px-4 font-medium">Diagnóstico / procedimiento</th>
                <th className="py-3 px-4 font-medium">Médico solicitante</th>
                <th className="py-3 px-4 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {cargando && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-[color:var(--slate-500)]">
                    Cargando…
                  </td>
                </tr>
              )}
              {!cargando &&
                cotizaciones.map((c) => {
                  const estilo = c.estado ? ESTADO_COLOR[c.estado] : null;
                  return (
                    <tr key={c.id} className="border-b border-[color:var(--line)] last:border-0">
                      <td className="py-3 px-4 ef-tabular font-semibold">{c.numero_cotizacion}</td>
                      <td className="py-3 px-4 ef-tabular text-[color:var(--slate-700)]">{fmtFecha(c.fecha)}</td>
                      <td className="py-3 px-4">{c.paciente_nombre}</td>
                      <td className="py-3 px-4 text-[color:var(--slate-700)]">{c.codigo_cliente || "—"}</td>
                      <td className="py-3 px-4">{c.diagnostico_procedimiento}</td>
                      <td className="py-3 px-4 text-[color:var(--slate-700)]">{c.medico_solicitante}</td>
                      <td className="py-3 px-4">
                        <select
                          value={c.estado || ""}
                          onChange={(e) => actualizarEstado(c.id, e.target.value)}
                          disabled={guardandoId === c.id}
                          className="rounded-sm px-2 py-1.5 text-xs font-semibold border-0"
                          style={{
                            background: estilo?.bg || "var(--gray-soft)",
                            color: estilo?.fg || "var(--slate-700)",
                          }}
                        >
                          <option value="" disabled>
                            Seleccionar…
                          </option>
                          {ESTADOS_COTIZACION.map((e) => (
                            <option key={e} value={e}>
                              {e}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              {!cargando && cotizaciones.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-[color:var(--slate-500)]">
                    Todavía no hay cotizaciones registradas. Agrégalas desde "Cirugías cotizadas".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
