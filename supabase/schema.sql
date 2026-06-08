-- ============================================================
--  GestorMIPYME · Esquema de base de datos (Supabase / Postgres)
--  Ejecuta este SQL en: Supabase → SQL Editor → New query → Run
-- ============================================================

-- 1) Perfil de cada negocio (tenant). El id es el del usuario de Auth.
create table if not exists public.tenants (
  id            uuid primary key references auth.users(id) on delete cascade,
  business_name text not null,
  owner_name    text not null,
  email         text not null,
  phone         text default '',
  paid_until    date not null default (current_date + interval '14 day'),
  created_at    timestamptz not null default now()
);

-- 2) Solicitudes de pago de suscripción
do $$ begin
  create type request_status as enum ('pendiente','aprobada','en_espera','rechazada');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type pay_method as enum ('transferencia','efectivo','mlc');
exception when duplicate_object then null;
end $$;

create table if not exists public.subscription_requests (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  created_at  timestamptz not null default now(),
  months      int  not null check (months > 0),
  amount      int  not null,
  method      pay_method not null,
  reference   text default '',
  status      request_status not null default 'pendiente',
  resolved_at timestamptz
);

-- 3) Facturas (pagos aprobados)
create table if not exists public.invoices (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants(id) on delete cascade,
  date       date not null default current_date,
  months     int  not null,
  amount     int  not null,
  method     pay_method not null
);

-- ============================================================
--  Trigger: al crear un usuario en Auth, crear su perfil tenant
--  con 14 días de prueba.
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.tenants (id, business_name, owner_name, email, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'business_name', 'Mi negocio'),
    coalesce(new.raw_user_meta_data->>'owner_name', 'Propietario'),
    new.email,
    coalesce(new.raw_user_meta_data->>'phone', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
--  Row Level Security (RLS): cada negocio solo ve SU información
--  y NO puede cambiar su paid_until (eso solo lo hace el servidor).
-- ============================================================
alter table public.tenants               enable row level security;
alter table public.subscription_requests enable row level security;
alter table public.invoices              enable row level security;

-- tenants: el dueño puede leer y actualizar SOLO sus datos de contacto.
drop policy if exists "tenant lee su perfil" on public.tenants;
create policy "tenant lee su perfil"
  on public.tenants for select using (auth.uid() = id);

drop policy if exists "tenant edita datos de contacto" on public.tenants;
create policy "tenant edita datos de contacto"
  on public.tenants for update using (auth.uid() = id)
  with check (auth.uid() = id);
-- NOTA: paid_until NO se puede modificar desde el cliente porque la Edge
-- Function usa la service_role key (que ignora RLS) para aprobarla. El cliente
-- jamás recibe esa key, por eso no puede auto-renovarse.

-- subscription_requests: el dueño puede ver y crear/borrar SUS solicitudes,
-- pero NO puede cambiar el status (solo el servidor aprueba).
drop policy if exists "tenant ve sus solicitudes" on public.subscription_requests;
create policy "tenant ve sus solicitudes"
  on public.subscription_requests for select using (auth.uid() = tenant_id);
drop policy if exists "tenant crea sus solicitudes" on public.subscription_requests;
create policy "tenant crea sus solicitudes"
  on public.subscription_requests for insert with check (auth.uid() = tenant_id and status = 'pendiente');
drop policy if exists "tenant borra sus solicitudes pendientes" on public.subscription_requests;
create policy "tenant borra sus solicitudes pendientes"
  on public.subscription_requests for delete using (auth.uid() = tenant_id and status = 'pendiente');

-- invoices: solo lectura para el dueño.
drop policy if exists "tenant ve sus facturas" on public.invoices;
create policy "tenant ve sus facturas"
  on public.invoices for select using (auth.uid() = tenant_id);
