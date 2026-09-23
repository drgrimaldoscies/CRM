export type Rol = "admin" | "staff";

export interface Profile {
  id: string;
  full_name: string | null;
  role: Rol;
  created_at: string;
}

export const ESPECIALIDADES = [
  "Cirugía Plástica",
  "Cirugía Bariátrica",
  "Traumatología",
  "Ginecología",
  "Oftalmología",
] as const;

export const ESTADOS_FLUJO = [
  "Indicación quirúrgica",
  "Pendiente de cotización",
  "Cotizado",
  "Presupuesto enviado",
  "En seguimiento",
  "Cirugía aceptada",
  "Cirugía programada",
  "Cirugía realizada",
] as const;

export const ESTADOS_ALTERNOS = [
  "No convertido",
  "Perdido",
  "Postergado",
  "Cancelado",
] as const;

export const TODOS_LOS_ESTADOS = [...ESTADOS_FLUJO, ...ESTADOS_ALTERNOS];

export const CANALES = [
  "WhatsApp",
  "Llamada telefónica",
  "Contacto presencial",
  "Correo electrónico",
  "Otro",
] as const;

export interface Medico {
  id: string;
  nombre: string;
  especialidad: string;
  activo: boolean;
}

export interface Oportunidad {
  id: string;
  paciente_nombre: string;
  paciente_edad: number | null;
  especialidad: string;
  procedimiento: string;
  medico_id: string | null;
  medico_nombre?: string | null;
  tipo_paciente: "Particular" | "Asegurado";
  seguro: string | null;
  metodo_pago: string;
  monto: number;
  estado: string;
  motivo_perdida: string | null;
  created_at: string;
  updated_at: string;
}

export interface Seguimiento {
  id: string;
  oportunidad_id: string;
  fecha: string;
  canal: string;
  responsable_id: string | null;
  responsable_nombre?: string | null;
  resultado: string;
  observaciones: string | null;
  proxima_accion: string | null;
  fecha_proxima_accion: string | null;
  created_at: string;
}

export const ESTADOS_COTIZACION = [
  "Cirugía Realizada",
  "Cirugía Programada",
  "Con seguimiento",
  "Cirugía Postergada",
  "No convertido",
] as const;

export interface CotizacionQuirurgica {
  id: string;
  numero_cotizacion: string;
  fecha: string;
  paciente_nombre: string;
  codigo_cliente: string | null;
  diagnostico_procedimiento: string;
  medico_solicitante: string;
  estado: string | null;
  created_at: string;
}
