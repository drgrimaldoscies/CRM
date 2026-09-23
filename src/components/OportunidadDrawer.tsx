import { useEffect, useState } from "react";
import { X, MessageCircle, Phone, Mail, User as UserIcon } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { Badge } from "./Badge";
import { CANALES } from "../types";
import type { Oportunidad, Seguimiento } from "../types";

function fmtBs(n: number) {
  return "Bs " + n.toLocaleString("es-BO");
}
function fmtFecha(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-BO", { day: "2-digit", month: "short" });
}
function CanalIcon({ canal }: { canal: string }) {
  if (canal === "WhatsApp") return <MessageCircle size={14} />;
  if (canal === "Llamada telefónica") return <Phone size={14} />;
  if (canal === "Correo electrónico") return <Mail size={14} />;
  return <UserIcon size={14} />;
}

export function OportunidadDrawer({
  oportunidad,
  onClose,
  onChanged,
}: {
  oportunidad: Oportunidad | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const [seguimientos, setSeguimientos] = useState<Seguimiento[]>([]);
  const [cargando, setCargando] = useState(false);
  const [canal, setCanal] = useState<string>(CANALES[0]);
  const [resultado, setResultado] = useState("");
  const [proximaAccion, setProximaAccion] = useState("");
  const [fechaProximaAccion, setFechaProximaAccion] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!oportunidad) return;
    setCargando(true);
    supabase
      .from("seguimientos")
      .select("*")
      .eq("oportunidad_id", oportunidad.id)
      .order("fecha", { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) setSeguimientos(data as Seguimiento[]);
        setCargando(false);
      });
  }, [oportunidad?.id]);

  if (!oportunidad) return null;

  async function registrarSeguimiento() {
    if (!resultado.trim() || !profile) return;
    setGuardando(true);
    const { error } = await supabase.from("seguimientos").insert({
      oportunidad_id: oportunidad!.id,
      canal,
      responsable_id: profile.id,
      resultado,
      proxima_accion: proximaAccion || null,
      fecha_proxima_accion: fechaProximaAccion || null,
    });
    if (!error) {
      setResultado("");
      setProximaAccion("");
      setFechaProximaAccion("");
      const { data } = await supabase
        .from("seguimientos")
        .select("*")
        .eq("oportunidad_id", oportunidad!.id)
        .order("fecha", { ascending: false });
      if (data) setSeguimientos(data as Seguimiento[]);
      onChanged();
    }
    setGuardando(false);
  }

  return (
    <div className="fixed inset-0 z-30 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="ef-drawer relative w-full max-w-md bg-[color:var(--paper)] h-full overflow-y-auto ef-scrollbar shadow-2xl">
        <div className="border-b border-[color:var(--line)] p-5 sticky top-0 bg-white z-10 flex items-start justify-between">
          <div>
            <h2 className="ef-serif text-xl font-medium">{oportunidad.paciente_nombre}</h2>
            <div className="mt-2">
              <Badge estado={oportunidad.estado} />
            </div>
          </div>
          <button onClick={onClose} className="ef-btn-ghost p-1.5 rounded-sm">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-5">
          <div className="ef-card p-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-[color:var(--slate-500)]">Procedimiento</div>
              <div>{oportunidad.procedimiento}</div>
            </div>
            <div>
              <div className="text-xs text-[color:var(--slate-500)]">Especialidad</div>
              <div>{oportunidad.especialidad}</div>
            </div>
            <div>
              <div className="text-xs text-[color:var(--slate-500)]">Tipo de paciente</div>
              <div>{oportunidad.tipo_paciente}</div>
            </div>
            <div>
              <div className="text-xs text-[color:var(--slate-500)]">Método de pago</div>
              <div>{oportunidad.metodo_pago}</div>
            </div>
            {isAdmin && (
              <div>
                <div className="text-xs text-[color:var(--slate-500)]">Monto presupuestado</div>
                <div className="ef-tabular font-semibold">{fmtBs(oportunidad.monto)}</div>
              </div>
            )}
            <div>
              <div className="text-xs text-[color:var(--slate-500)]">Registrada el</div>
              <div>{fmtFecha(oportunidad.created_at.slice(0, 10))}</div>
            </div>
          </div>

          {oportunidad.motivo_perdida && (
            <div className="ef-card p-4" style={{ borderColor: "var(--brick)" }}>
              <div className="text-xs text-[color:var(--brick)] font-semibold mb-1">Motivo de no conversión</div>
              <div className="text-sm">{oportunidad.motivo_perdida}</div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold mb-3">Historial de seguimiento</h3>
            {cargando && <span className="text-sm text-[color:var(--slate-500)]">Cargando…</span>}
            <div className="flex flex-col gap-3">
              {!cargando && seguimientos.length === 0 && (
                <span className="text-sm text-[color:var(--slate-500)]">Todavía no hay seguimientos registrados.</span>
              )}
              {seguimientos.map((s) => (
                <div key={s.id} className="ef-card p-3 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-xs font-semibold text-[color:var(--green-800)]">
                      <CanalIcon canal={s.canal} /> {s.canal}
                    </span>
                    <span className="text-xs text-[color:var(--slate-500)]">{fmtFecha(s.fecha)}</span>
                  </div>
                  <div className="text-sm font-medium">{s.resultado}</div>
                  {s.proxima_accion && (
                    <div className="text-xs text-[color:var(--green-700)] mt-1">
                      Próxima acción: {s.proxima_accion}
                      {s.fecha_proxima_accion ? " · " + fmtFecha(s.fecha_proxima_accion) : ""}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="ef-card p-4">
            <h3 className="text-sm font-semibold mb-3">Registrar nuevo seguimiento</h3>
            <div className="flex flex-col gap-3">
              <select value={canal} onChange={(e) => setCanal(e.target.value)} className="ef-input rounded-sm px-3 py-2 text-sm">
                {CANALES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <input
                value={resultado}
                onChange={(e) => setResultado(e.target.value)}
                placeholder="Resultado del contacto"
                className="ef-input rounded-sm px-3 py-2 text-sm"
              />
              <input
                value={proximaAccion}
                onChange={(e) => setProximaAccion(e.target.value)}
                placeholder="Próxima acción (opcional)"
                className="ef-input rounded-sm px-3 py-2 text-sm"
              />
              <input
                type="date"
                value={fechaProximaAccion}
                onChange={(e) => setFechaProximaAccion(e.target.value)}
                className="ef-input rounded-sm px-3 py-2 text-sm"
              />
              <button
                onClick={registrarSeguimiento}
                disabled={guardando || !resultado.trim()}
                className="ef-btn-primary rounded-sm px-4 py-2 text-sm font-semibold"
              >
                {guardando ? "Guardando…" : "Guardar seguimiento"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
