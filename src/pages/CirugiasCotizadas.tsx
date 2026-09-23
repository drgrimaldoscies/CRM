import { useEffect, useState, FormEvent } from "react";
import { Plus, X } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { AppLayout } from "../components/AppLayout";
import type { CotizacionQuirurgica } from "../types";

function fmtFecha(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-BO", { day: "2-digit", month: "short", year: "numeric" });
}

function siguienteNumero(cotizaciones: CotizacionQuirurgica[]) {
  const nums = cotizaciones
    .map((c) => parseInt((c.numero_cotizacion.match(/\d+/) || ["0"])[0], 10))
    .filter((n) => !isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return "COT-" + String(max + 1).padStart(4, "0");
}

export function CirugiasCotizadas() {
  const [cotizaciones, setCotizaciones] = useState<CotizacionQuirurgica[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);

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

  return (
    <AppLayout title="Cirugías cotizadas" subtitle="Registro de cada cotización quirúrgica entregada al paciente">
      <div className="flex flex-col gap-4">
        <div className="flex justify-end">
          <button
            onClick={() => setMostrarForm(true)}
            className="ef-btn-primary rounded-sm px-4 py-2 text-sm font-semibold flex items-center gap-2"
          >
            <Plus size={15} /> Nueva cotización
          </button>
        </div>

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
                </tr>
              </thead>
              <tbody>
                {cargando && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-[color:var(--slate-500)]">
                      Cargando…
                    </td>
                  </tr>
                )}
                {!cargando &&
                  cotizaciones.map((c) => (
                    <tr key={c.id} className="border-b border-[color:var(--line)] last:border-0">
                      <td className="py-3 px-4 ef-tabular font-semibold">{c.numero_cotizacion}</td>
                      <td className="py-3 px-4 ef-tabular text-[color:var(--slate-700)]">{fmtFecha(c.fecha)}</td>
                      <td className="py-3 px-4">{c.paciente_nombre}</td>
                      <td className="py-3 px-4 text-[color:var(--slate-700)]">{c.codigo_cliente || "—"}</td>
                      <td className="py-3 px-4">{c.diagnostico_procedimiento}</td>
                      <td className="py-3 px-4 text-[color:var(--slate-700)]">{c.medico_solicitante}</td>
                    </tr>
                  ))}
                {!cargando && cotizaciones.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-[color:var(--slate-500)]">
                      Todavía no hay cotizaciones registradas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {mostrarForm && (
        <NuevaCotizacionForm
          sugerido={siguienteNumero(cotizaciones)}
          onClose={() => setMostrarForm(false)}
          onCreada={cargar}
        />
      )}
    </AppLayout>
  );
}

function NuevaCotizacionForm({
  sugerido,
  onClose,
  onCreada,
}: {
  sugerido: string;
  onClose: () => void;
  onCreada: () => void;
}) {
  const [numeroCotizacion, setNumeroCotizacion] = useState(sugerido);
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [pacienteNombre, setPacienteNombre] = useState("");
  const [codigoCliente, setCodigoCliente] = useState("");
  const [diagnostico, setDiagnostico] = useState("");
  const [medicoSolicitante, setMedicoSolicitante] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!numeroCotizacion.trim() || !pacienteNombre.trim() || !diagnostico.trim() || !medicoSolicitante.trim()) {
      setError("Completa los campos obligatorios.");
      return;
    }
    setGuardando(true);
    setError(null);
    const { error } = await supabase.from("cotizaciones_quirurgicas").insert({
      numero_cotizacion: numeroCotizacion,
      fecha,
      paciente_nombre: pacienteNombre,
      codigo_cliente: codigoCliente || null,
      diagnostico_procedimiento: diagnostico,
      medico_solicitante: medicoSolicitante,
    });
    setGuardando(false);
    if (error) {
      setError(
        error.message.includes("duplicate")
          ? "Ese número de cotización ya existe."
          : "No se pudo guardar la cotización. Intenta nuevamente."
      );
      return;
    }
    onCreada();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4">
      <div className="ef-card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto ef-scrollbar">
        <div className="flex items-center justify-between mb-4">
          <h2 className="ef-serif text-xl font-medium">Nueva cotización</h2>
          <button onClick={onClose} className="ef-btn-ghost p-1.5 rounded-sm">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              value={numeroCotizacion}
              onChange={(e) => setNumeroCotizacion(e.target.value)}
              placeholder="N° de cotización"
              className="ef-input rounded-sm px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="ef-input rounded-sm px-3 py-2 text-sm"
            />
          </div>
          <input
            value={pacienteNombre}
            onChange={(e) => setPacienteNombre(e.target.value)}
            placeholder="Nombre del paciente"
            className="ef-input rounded-sm px-3 py-2 text-sm"
          />
          <input
            value={codigoCliente}
            onChange={(e) => setCodigoCliente(e.target.value)}
            placeholder="Código de cliente (opcional)"
            className="ef-input rounded-sm px-3 py-2 text-sm"
          />
          <textarea
            value={diagnostico}
            onChange={(e) => setDiagnostico(e.target.value)}
            placeholder="Diagnóstico o procedimiento"
            rows={2}
            className="ef-input rounded-sm px-3 py-2 text-sm resize-none"
          />
          <input
            value={medicoSolicitante}
            onChange={(e) => setMedicoSolicitante(e.target.value)}
            placeholder="Médico solicitante"
            className="ef-input rounded-sm px-3 py-2 text-sm"
          />
          {error && <div className="text-xs text-[color:var(--brick)]">{error}</div>}
          <button type="submit" disabled={guardando} className="ef-btn-primary rounded-sm px-4 py-2 text-sm font-semibold mt-2">
            {guardando ? "Guardando…" : "Guardar cotización"}
          </button>
        </form>
      </div>
    </div>
  );
}
