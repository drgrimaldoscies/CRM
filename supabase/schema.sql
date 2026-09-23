-- =====================================================================
-- EMBUDO DE CONVERSIÓN QUIRÚRGICA — SCRIPT ÚNICO DE BASE DE DATOS
-- =====================================================================
-- Cómo usar este archivo:
-- 1. Entra a tu proyecto de Supabase.
-- 2. Ve a "SQL Editor" (en el menú de la izquierda).
-- 3. Crea una consulta nueva, pega TODO este archivo, y presiona "Run".
-- 4. Solo necesitas hacer esto UNA vez.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. TABLA: profiles
-- Guarda el nombre y el rol de cada persona que usa el sistema.
-- Está conectada uno a uno con la tabla interna de usuarios de Supabase.
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'staff' check (role in ('admin', 'staff')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. TABLA: medicos
-- Lista simple de médicos de la clínica, usada en los formularios.
-- ---------------------------------------------------------------------
create table if not exists public.medicos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  especialidad text not null,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. TABLA: oportunidades
-- El corazón del sistema: cada fila es un paciente en el embudo de
-- conversión quirúrgica, desde la indicación hasta la cirugía (o pérdida).
-- ---------------------------------------------------------------------
create table if not exists public.oportunidades (
  id uuid primary key default gen_random_uuid(),
  paciente_nombre text not null,
  paciente_edad int,
  especialidad text not null,
  procedimiento text not null,
  medico_id uuid references public.medicos(id) on delete set null,
  tipo_paciente text not null check (tipo_paciente in ('Particular', 'Asegurado')),
  seguro text,
  metodo_pago text not null default 'Efectivo',
  monto numeric(12, 2) not null default 0,
  estado text not null default 'Indicación quirúrgica' check (
    estado in (
      'Indicación quirúrgica', 'Pendiente de cotización', 'Cotizado',
      'Presupuesto enviado', 'En seguimiento', 'Cirugía aceptada',
      'Cirugía programada', 'Cirugía realizada',
      'No convertido', 'Perdido', 'Postergado', 'Cancelado'
    )
  ),
  motivo_perdida text,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 4. TABLA: cotizaciones_quirurgicas
-- Registro simple de cotizaciones (independiente del embudo de
-- oportunidades) con su posterior seguimiento de estado en la página
-- "Cirugías Efectivas".
-- ---------------------------------------------------------------------
create table if not exists public.cotizaciones_quirurgicas (
  id uuid primary key default gen_random_uuid(),
  numero_cotizacion text not null,
  fecha date not null default current_date,
  paciente_nombre text not null,
  codigo_cliente text,
  diagnostico_procedimiento text not null,
  medico_solicitante text not null,
  estado text check (
    estado in (
      'Cirugía Realizada', 'Cirugía Programada', 'Con seguimiento',
      'Cirugía Postergada', 'No convertido'
    )
  ),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cotizaciones_fecha on public.cotizaciones_quirurgicas(fecha);

-- ---------------------------------------------------------------------
-- 5. TABLA: seguimientos
-- Cada contacto realizado con el paciente dentro de una oportunidad.
-- ---------------------------------------------------------------------
create table if not exists public.seguimientos (
  id uuid primary key default gen_random_uuid(),
  oportunidad_id uuid not null references public.oportunidades(id) on delete cascade,
  fecha date not null default current_date,
  canal text not null check (
    canal in ('WhatsApp', 'Llamada telefónica', 'Contacto presencial', 'Correo electrónico', 'Otro')
  ),
  responsable_id uuid references public.profiles(id),
  resultado text not null,
  observaciones text,
  proxima_accion text,
  fecha_proxima_accion date,
  created_at timestamptz not null default now()
);

create index if not exists idx_seguimientos_oportunidad on public.seguimientos(oportunidad_id);
create index if not exists idx_oportunidades_estado on public.oportunidades(estado);

-- ---------------------------------------------------------------------
-- 6. FUNCIÓN AUXILIAR: is_admin()
-- Revisa si la persona que hace la consulta tiene rol de administrador.
-- Se usa dentro de las políticas de seguridad (RLS) más abajo.
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------
-- 7. TRIGGER: crear perfil automáticamente al registrar un usuario nuevo
-- Cuando alguien se crea en auth.users (ya sea manualmente desde el panel
-- de Supabase, o mediante el botón "Crear usuario" dentro del software),
-- este disparador crea su fila en "profiles" con rol "staff" por defecto.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'staff'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY (seguridad a nivel de fila)
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.medicos enable row level security;
alter table public.oportunidades enable row level security;
alter table public.cotizaciones_quirurgicas enable row level security;
alter table public.seguimientos enable row level security;

-- profiles: cada quien ve su propio perfil; el administrador ve todos.
drop policy if exists "profiles_select_propio_o_admin" on public.profiles;
create policy "profiles_select_propio_o_admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

-- profiles: cada quien edita su propio nombre, pero NO su propio rol.
drop policy if exists "profiles_update_propio" on public.profiles;
create policy "profiles_update_propio"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

-- profiles: el administrador puede editar cualquier perfil, incluido el rol.
drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

-- medicos: cualquier persona autenticada puede ver la lista de médicos.
drop policy if exists "medicos_select_autenticado" on public.medicos;
create policy "medicos_select_autenticado"
  on public.medicos for select
  using (auth.role() = 'authenticated');

-- medicos: solo el administrador puede crear, editar o eliminar médicos.
drop policy if exists "medicos_admin_todo" on public.medicos;
create policy "medicos_admin_todo"
  on public.medicos for all
  using (public.is_admin())
  with check (public.is_admin());

-- oportunidades: cualquier persona autenticada puede ver y crear.
drop policy if exists "oportunidades_select_autenticado" on public.oportunidades;
create policy "oportunidades_select_autenticado"
  on public.oportunidades for select
  using (auth.role() = 'authenticated');

drop policy if exists "oportunidades_insert_autenticado" on public.oportunidades;
create policy "oportunidades_insert_autenticado"
  on public.oportunidades for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "oportunidades_update_autenticado" on public.oportunidades;
create policy "oportunidades_update_autenticado"
  on public.oportunidades for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- oportunidades: solo el administrador puede eliminar.
drop policy if exists "oportunidades_delete_admin" on public.oportunidades;
create policy "oportunidades_delete_admin"
  on public.oportunidades for delete
  using (public.is_admin());

-- cotizaciones_quirurgicas: cualquier persona autenticada puede ver, crear
-- y actualizar (incluido el campo "estado" desde Cirugías Efectivas).
drop policy if exists "cotizaciones_select_autenticado" on public.cotizaciones_quirurgicas;
create policy "cotizaciones_select_autenticado"
  on public.cotizaciones_quirurgicas for select
  using (auth.role() = 'authenticated');

drop policy if exists "cotizaciones_insert_autenticado" on public.cotizaciones_quirurgicas;
create policy "cotizaciones_insert_autenticado"
  on public.cotizaciones_quirurgicas for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "cotizaciones_update_autenticado" on public.cotizaciones_quirurgicas;
create policy "cotizaciones_update_autenticado"
  on public.cotizaciones_quirurgicas for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- cotizaciones_quirurgicas: solo el administrador puede eliminar.
drop policy if exists "cotizaciones_delete_admin" on public.cotizaciones_quirurgicas;
create policy "cotizaciones_delete_admin"
  on public.cotizaciones_quirurgicas for delete
  using (public.is_admin());

-- seguimientos: cualquier persona autenticada puede ver, crear y actualizar
-- (por ejemplo, para marcar una acción pendiente como realizada).
drop policy if exists "seguimientos_select_autenticado" on public.seguimientos;
create policy "seguimientos_select_autenticado"
  on public.seguimientos for select
  using (auth.role() = 'authenticated');

drop policy if exists "seguimientos_insert_autenticado" on public.seguimientos;
create policy "seguimientos_insert_autenticado"
  on public.seguimientos for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "seguimientos_update_autenticado" on public.seguimientos;
create policy "seguimientos_update_autenticado"
  on public.seguimientos for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- seguimientos: solo el administrador puede eliminar.
drop policy if exists "seguimientos_delete_admin" on public.seguimientos;
create policy "seguimientos_delete_admin"
  on public.seguimientos for delete
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- 9. DATOS INICIALES: médicos de ejemplo (puedes editarlos o borrarlos
-- luego desde el mismo software, o modificando esta lista antes de
-- ejecutar el script).
-- ---------------------------------------------------------------------
insert into public.medicos (nombre, especialidad) values
  ('Dr. Iván Herrera', 'Cirugía Plástica'),
  ('Dra. Carla Montaño', 'Cirugía Plástica'),
  ('Dr. Marco Peña', 'Cirugía Bariátrica'),
  ('Dra. Lucía Rocha', 'Traumatología'),
  ('Dr. Sergio Vaca', 'Ginecología'),
  ('Dra. Andrea Salvatierra', 'Oftalmología')
on conflict do nothing;

-- =====================================================================
-- LISTO. La base de datos ya está creada.
--
-- ÚLTIMO PASO MANUAL (solo la primera vez):
-- Después de crear tu primer usuario administrador desde
-- "Authentication" → "Add user" en el panel de Supabase, ese usuario
-- se crea con rol "staff" por defecto. Conviértelo en administrador
-- ejecutando esta línea (cambia el correo por el que usaste):
--
-- update public.profiles set role = 'admin'
--   where id = (select id from auth.users where email = 'tu_correo@ejemplo.com');
-- =====================================================================
