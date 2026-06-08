-- ============================================================
--  AlNegocio · Datos del negocio EN LA NUBE (multi-vendedor + tiempo real)
--  Ejecuta este SQL DESPUÉS de schema.sql, en: SQL Editor → New query → Run
--  Este archivo se puede ejecutar varias veces sin error.
-- ============================================================

-- ------------------------------------------------------------
-- 1) MIEMBROS: vincula usuarios de Auth a un negocio (tenant) con un rol.
-- ------------------------------------------------------------
do $$ begin
  create type member_role as enum ('owner', 'vendedor', 'admin');
exception when duplicate_object then null;
end $$;

create table if not exists public.members (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null default '',
  role        member_role not null default 'vendedor',
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (user_id)
);

-- Función: ¿a qué negocio pertenece el usuario actual?
create or replace function public.current_tenant()
returns uuid
language sql stable security definer set search_path = public
as $$
  select tenant_id from public.members where user_id = auth.uid() limit 1;
$$;

-- Al crear el tenant (dueño), añadirlo como miembro 'owner'.
create or replace function public.handle_new_owner_member()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.members (tenant_id, user_id, name, role)
  values (new.id, new.id, new.owner_name, 'owner')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_tenant_created on public.tenants;
create trigger on_tenant_created
  after insert on public.tenants
  for each row execute function public.handle_new_owner_member();

-- ------------------------------------------------------------
-- 2) TABLAS DE DATOS DEL NEGOCIO
-- ------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  sku text default '',
  category_id uuid,
  unit text default 'u',
  cost numeric not null default 0,
  price numeric not null default 0,
  stock numeric not null default 0,
  min_stock numeric not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  kind text not null default 'cliente',
  phone text default '',
  note text default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  seller_id uuid,
  seller_name text default '',
  date timestamptz not null default now(),
  customer_id uuid,
  customer_name text default '',
  items jsonb not null default '[]',
  discount numeric not null default 0,
  payment text not null default 'efectivo',
  subtotal numeric not null default 0,
  total numeric not null default 0,
  cogs numeric not null default 0,
  profit numeric not null default 0
);

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  date timestamptz not null default now(),
  supplier_id uuid,
  supplier_name text default '',
  items jsonb not null default '[]',
  total numeric not null default 0,
  payment text not null default 'efectivo'
);

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  role text default '',
  base_salary numeric not null default 0,
  commission_pct numeric not null default 0,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  date timestamptz not null default now(),
  category text not null default 'otros',
  description text default '',
  amount numeric not null default 0,
  payment text not null default 'efectivo'
);

-- ------------------------------------------------------------
-- 3) SEGURIDAD (RLS): cada usuario solo accede a los datos de SU negocio.
-- ------------------------------------------------------------
alter table public.members    enable row level security;
alter table public.categories enable row level security;
alter table public.products   enable row level security;
alter table public.contacts   enable row level security;
alter table public.sales      enable row level security;
alter table public.purchases  enable row level security;
alter table public.employees  enable row level security;
alter table public.expenses   enable row level security;

-- members
drop policy if exists "ver miembros de mi negocio" on public.members;
create policy "ver miembros de mi negocio" on public.members
  for select using (tenant_id = public.current_tenant());

drop policy if exists "owner gestiona miembros" on public.members;
create policy "owner gestiona miembros" on public.members
  for all using (tenant_id = public.current_tenant()
    and exists (select 1 from public.members m where m.user_id = auth.uid() and m.role = 'owner'))
  with check (tenant_id = public.current_tenant());

-- datos del negocio: acceso total si es de mi negocio
drop policy if exists "datos categories" on public.categories;
create policy "datos categories" on public.categories
  for all using (tenant_id = public.current_tenant()) with check (tenant_id = public.current_tenant());

drop policy if exists "datos products" on public.products;
create policy "datos products" on public.products
  for all using (tenant_id = public.current_tenant()) with check (tenant_id = public.current_tenant());

drop policy if exists "datos contacts" on public.contacts;
create policy "datos contacts" on public.contacts
  for all using (tenant_id = public.current_tenant()) with check (tenant_id = public.current_tenant());

drop policy if exists "datos sales" on public.sales;
create policy "datos sales" on public.sales
  for all using (tenant_id = public.current_tenant()) with check (tenant_id = public.current_tenant());

drop policy if exists "datos purchases" on public.purchases;
create policy "datos purchases" on public.purchases
  for all using (tenant_id = public.current_tenant()) with check (tenant_id = public.current_tenant());

drop policy if exists "datos employees" on public.employees;
create policy "datos employees" on public.employees
  for all using (tenant_id = public.current_tenant()) with check (tenant_id = public.current_tenant());

drop policy if exists "datos expenses" on public.expenses;
create policy "datos expenses" on public.expenses
  for all using (tenant_id = public.current_tenant()) with check (tenant_id = public.current_tenant());

-- ------------------------------------------------------------
-- 4) TIEMPO REAL: el dueño ve las ventas aparecer en vivo.
--    (protegido para no fallar si ya estaban añadidas)
-- ------------------------------------------------------------
do $$ begin
  alter publication supabase_realtime add table public.sales;
exception when duplicate_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.products;
exception when duplicate_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.purchases;
exception when duplicate_object then null;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.expenses;
exception when duplicate_object then null;
end $$;
