import { useEffect, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { AppLayout } from "../components/AppLayout";
import { Badge } from "../components/Badge";
import { OportunidadDrawer } from "../components/OportunidadDrawer";
import { useAuth } from "../context/AuthContext";
import {
  ESPECIALIDADES,
  TODOS_LOS_ESTADOS,
  type Oportunidad,
  type Medico,
} from "../types";

function fmtBs(n: number) {
  return "Bs " + n.toLocaleString("es-BO");
}
function diasDesde(iso: string) {
  const d = new Date(iso.slice(0, 10) + "T00:00:00");
  return Math.max(0, Math.round((Date.now() - d.getTime()) / 86400000));
}

export function Oportunidades() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const [oportunidades, setOportunidades] = useState<Oportunidad[]>([]);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [cargando, setCargando] = useState(true);
  const [seleccion, setSeleccion] = useState<Oportunidad | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);

  const [busqueda, setBusqueda] = useState("");
  const [fEstado, setFEstado] = useState("Todos");
  const [fEspecialidad, setFEspecialidad] = useState("Todas");

  async function cargar() {
    setCargando(true);
    const [{ data: ops }, { data: meds }] = await Promise.all([
      supabase.from("oportunidades").select("*").order("created_at", { ascending: false }),
      supabase.from("medicos").select("*").eq("activo", true),
    ]);
    if (ops) setOportunidades(ops as Oportunidad[]);
    if (meds) setMedicos(meds as Medico[]);
    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  const filtradas = oportunidades.filter((o) => {
    if (fEstado !== "Todos" && o.estado !== fEstado) return false;
    if (fEspecialidad !== "Todas" && o.especialidad !== fEspecialidad) return false;
    if (busqueda && !o.paciente_nombre.toLowerCase().includes(busqueda.toLowerCase())) return false;
    return true;
  });

  return (
    <AppLayout title="Oportunidades quirúrgicas" subtitle="Registro y seguimiento de cada paciente en el embudo">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 ef-input rounded-sm px-3 py-2 flex-1 min-w-[200px]">
            <Search size={15} color="var(--slate-500)" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar paciente"
              className="outline-none text-sm w-full bg-transparent"
            />
          </div>
          <select value={fEspecialidad} onChange={(e) => setFEspecialidad(e.target.value)} className="ef-input rounded-sm px-3 py-2 text-sm">
            <option>Todas</option>
            {ESPECIALIDADES.map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
          <select value={fEstado} onChange={(e) => setFEstado(e.target.value)} className="ef-input rounded-sm px-3 py-2 text-sm">
            <option>Todos</option>
            {TODOS_LOS_ESTADOS.map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
          <button
            onClick={() => setMostrarForm(true)}
            className="ef-btn-primary rounded-sm px-4 py-2 text-sm font-semibold flex items-center gap-2"
          >
            <Plus size={15} /> Nueva oportunidad
          </button>
        </div>

        <div className="ef-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[color:var(--slate-500)] border-b border-[color:var(--line)]">
                  <th className="py-3 px-4 font-medium">Paciente</th>
                  <th className="py-3 px-4 font-medium">Especialidad / procedimiento</th>
                  <th className="py-3 px-4 font-medium">Estado</th>
                  {isAdmin && <th className="py-3 px-4 font-medium">Monto</th>}
                  <th className="py-3 px-4 font-medium">Días registrada</th>
                </tr>
              </thead>
              <tbody>
                {cargando && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm text-[color:var(--slate-500)]">
                      Cargando…
                    </td>
                  </tr>
                )}
                {!cargando &&
                  filtradas.map((o) => (
                    <tr
                      key={o.id}
                      onClick={() => setSeleccion(o)}
                      className="ef-row border-b border-[color:var(--line)] last:border-0"
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold">{o.paciente_nombre}</div>
                        <div className="text-xs text-[color:var(--slate-500)]">
                          {o.tipo_paciente}
                          {o.paciente_edad ? " · " + o.paciente_edad + " años" : ""}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div>{o.procedimiento}</div>
                        <div className="text-xs text-[color:var(--slate-500)]">{o.especialidad}</div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge estado={o.estado} />
                      </td>
                      {isAdmin && <td className="py-3 px-4 ef-tabular">{fmtBs(Number(o.monto))}</td>}
                      <td className="py-3 px-4 ef-tabular text-[color:var(--slate-700)]">
                        {diasDesde(o.created_at)}
                      </td>
                    </tr>
                  ))}
                {!cargando && filtradas.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm text-[color:var(--slate-500)]">
                      Ninguna oportunidad coincide con los filtros aplicados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <OportunidadDrawer oportunidad={seleccion} onClose={() => setSeleccion(null)} onChanged={cargar} />

      {mostrarForm && (
        <NuevaOportunidadForm medicos={medicos} onClose={() => setMostrarForm(false)} onCreada={cargar} />
      )}
    </AppLayout>
  );
}

function NuevaOportunidadForm({
  medicos,
  onClose,
  onCreada,
}: {
  medicos: Medico[];
  onClose: () => void;
  onCreada: () => void;
}) {
  const [pacienteNombre, setPacienteNombre] = useState("");
  const [pacienteEdad, setPacienteEdad] = useState("");
  const [especialidad, setEspecialidad] = useState<string>(ESPECIALIDADES[0]);
  const [procedimiento, setProcedimiento] = useState("");
  const [medicoId, setMedicoId] = useState("");
  const [tipoPaciente, setTipoPaciente] = useState<"Particular" | "Asegurado">("Particular");
  const [seguro, setSeguro] = useState("");
  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const [monto, setMonto] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    if (!pacienteNombre.trim() || !procedimiento.trim()) {
      setError("El nombre del paciente y el procedimiento son obligatorios.");
      return;
    }
    setGuardando(true);
    setError(null);
    const { error } = await supabase.from("oportunidades").insert({
      paciente_nombre: pacienteNombre,
      paciente_edad: pacienteEdad ? Number(pacienteEdad) : null,
      especialidad,
      procedimiento,
      medico_id: medicoId || null,
      tipo_paciente: tipoPaciente,
      seguro: tipoPaciente === "Asegurado" ? seguro : null,
      metodo_pago: metodoPago,
      monto: monto ? Number(monto) : 0,
      estado: "Indicación quirúrgica",
    });
    setGuardando(false);
    if (error) {
      setError("No se pudo guardar la oportunidad. Intenta nuevamente.");
      return;
    }
    onCreada();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4">
      <div className="ef-card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto ef-scrollbar">
        <div className="flex items-center justify-between mb-4">
          <h2 className="ef-serif text-xl font-medium">Nueva oportunidad quirúrgica</h2>
          <button onClick={onClose} className="ef-btn-ghost p-1.5 rounded-sm">
            <X size={18} />
          </button>
        </div>
        <div className="flex flex-col gap-3">
          <input
            value={pacienteNombre}
            onChange={(e) => setPacienteNombre(e.target.value)}
            placeholder="Nombre del paciente"
            className="ef-input rounded-sm px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              value={pacienteEdad}
              onChange={(e) => setPacienteEdad(e.target.value)}
              placeholder="Edad"
              type="number"
              className="ef-input rounded-sm px-3 py-2 text-sm"
            />
            <select value={tipoPaciente} onChange={(e) => setTipoPaciente(e.target.value as any)} className="ef-input rounded-sm px-3 py-2 text-sm">
              <option>Particular</option>
              <option>Asegurado</option>
            </select>
          </div>
          <select value={especialidad} onChange={(e) => setEspecialidad(e.target.value)} className="ef-input rounded-sm px-3 py-2 text-sm">
            {ESPECIALIDADES.map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
          <input
            value={procedimiento}
            onChange={(e) => setProcedimiento(e.target.value)}
            placeholder="Procedimiento"
            className="ef-input rounded-sm px-3 py-2 text-sm"
          />
          <select value={medicoId} onChange={(e) => setMedicoId(e.target.value)} className="ef-input rounded-sm px-3 py-2 text-sm">
            <option value="">Sin médico asignado</option>
            {medicos
              .filter((m) => m.especialidad === especialidad)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
          </select>
          {tipoPaciente === "Asegurado" && (
            <input
              value={seguro}
              onChange={(e) => setSeguro(e.target.value)}
              placeholder="Compañía de seguro"
              className="ef-input rounded-sm px-3 py-2 text-sm"
            />
          )}
          <div className="grid grid-cols-2 gap-3">
            <select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} className="ef-input rounded-sm px-3 py-2 text-sm">
              <option>Efectivo</option>
              <option>Tarjeta</option>
              <option>Transferencia</option>
              <option>Financiamiento</option>
              <option>Seguro</option>
            </select>
            <input
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="Monto estimado (Bs)"
              type="number"
              className="ef-input rounded-sm px-3 py-2 text-sm"
            />
          </div>
          {error && <div className="text-xs text-[color:var(--brick)]">{error}</div>}
          <button onClick={guardar} disabled={guardando} className="ef-btn-primary rounded-sm px-4 py-2 text-sm font-semibold mt-2">
            {guardando ? "Guardando…" : "Guardar oportunidad"}
          </button>
        </div>
      </div>
    </div>
  );
}
