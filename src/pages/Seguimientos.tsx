import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { AppLayout } from "../components/AppLayout";
import { Badge } from "../components/Badge";
import { OportunidadDrawer } from "../components/OportunidadDrawer";
import type { Oportunidad, Seguimiento } from "../types";

function fmtFecha(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-BO", { day: "2-digit", month: "short" });
}

interface Pendiente {
  seguimientoId: string;
  oportunidad: Oportunidad;
  accion: string;
  fecha: string;
  vencido: boolean;
}

export function Seguimientos() {
  const [pendientes, setPendientes] = useState<Pendiente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [seleccion, setSeleccion] = useState<Oportunidad | null>(null);

  async function cargar() {
    setCargando(true);
    const hoy = new Date();

    const { data: seguimientos } = await supabase
      .from("seguimientos")
      .select("*, oportunidades(*)")
      .not("fecha_proxima_accion", "is", null)
      .order("fecha_proxima_accion", { ascending: true });

    if (seguimientos) {
      // Nos quedamos solo con la última acción pendiente registrada por oportunidad.
      const porOportunidad = new Map<string, any>();
      for (const s of seguimientos as any[]) {
        porOportunidad.set(s.oportunidad_id, s);
      }
      const lista: Pendiente[] = Array.from(porOportunidad.values())
        .filter((s) => s.oportunidades)
        .map((s) => ({
          seguimientoId: s.id,
          oportunidad: s.oportunidades as Oportunidad,
          accion: s.proxima_accion || "Contactar al paciente",
          fecha: s.fecha_proxima_accion,
          vencido: new Date(s.fecha_proxima_accion) < hoy,
        }))
        .sort((a, b) => a.fecha.localeCompare(b.fecha));
      setPendientes(lista);
    }
    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  async function marcarHecho(seguimientoId: string) {
    await supabase.from("seguimientos").update({ fecha_proxima_accion: null, proxima_accion: null }).eq("id", seguimientoId);
    cargar();
  }

  return (
    <AppLayout title="Seguimientos pendientes" subtitle="Próximas acciones ordenadas por fecha, en todas las oportunidades activas">
      <div className="ef-card divide-y divide-[color:var(--line)]">
        {cargando && <div className="p-8 text-center text-sm text-[color:var(--slate-500)]">Cargando…</div>}
        {!cargando &&
          pendientes.map((p) => (
            <div key={p.seguimientoId} className="flex items-center justify-between gap-4 p-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{p.oportunidad.paciente_nombre}</span>
                  <Badge estado={p.oportunidad.estado} />
                </div>
                <div className="text-sm text-[color:var(--slate-700)] mt-1">{p.accion}</div>
              </div>
              <div
                className="text-xs font-semibold ef-tabular whitespace-nowrap"
                style={{ color: p.vencido ? "var(--brick)" : "var(--slate-500)" }}
              >
                {p.vencido ? "Vencido · " : ""}
                {fmtFecha(p.fecha)}
              </div>
              <button
                onClick={() => setSeleccion(p.oportunidad)}
                className="ef-btn-ghost text-xs font-semibold px-3 py-1.5 rounded-sm border border-[color:var(--line)]"
              >
                Ver ficha
              </button>
              <button
                onClick={() => marcarHecho(p.seguimientoId)}
                className="ef-btn-ghost p-1.5 rounded-sm border border-[color:var(--line)]"
                title="Marcar como contactado"
              >
                <Check size={14} color="var(--teal)" />
              </button>
            </div>
          ))}
        {!cargando && pendientes.length === 0 && (
          <div className="p-8 text-center text-sm text-[color:var(--slate-500)]">
            No hay próximas acciones pendientes.
          </div>
        )}
      </div>

      <OportunidadDrawer oportunidad={seleccion} onClose={() => setSeleccion(null)} onChanged={cargar} />
    </AppLayout>
  );
}
