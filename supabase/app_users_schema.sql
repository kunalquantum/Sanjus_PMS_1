-- App user authentication schema for Sneha Asha PMS
-- Uses pgcrypto password hashing with crypt()/gen_salt('bf')
-- Run this in Supabase SQL Editor before wiring the frontend login flow

create extension if not exists "pgcrypto";

do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'app_role'
  ) then
    create type public.app_role as enum (
      'ADMIN',
      'PROJECT_MANAGER',
      'TEACHER',
      'STUDENT',
      'FUNDER'
    );
  end if;
end
$$;

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  password_hash text not null,
  role public.app_role not null default 'STUDENT',
  organization text,
  is_active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_users_email_lower check (email = lower(email))
);

create index if not exists idx_app_users_email on public.app_users(email);
create index if not exists idx_app_users_role on public.app_users(role);
create index if not exists idx_app_users_active on public.app_users(is_active);

create or replace function public.set_app_users_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_app_users_updated_at on public.app_users;
create trigger trg_app_users_updated_at
before update on public.app_users
for each row
execute function public.set_app_users_updated_at();

create or replace function public.create_app_user(
  p_full_name text,
  p_email text,
  p_password text,
  p_role public.app_role default 'STUDENT',
  p_organization text default null
)
returns public.app_users
language plpgsql
security definer
as $$
declare
  v_user public.app_users;
begin
  insert into public.app_users (
    full_name,
    email,
    password_hash,
    role,
    organization
  )
  values (
    trim(p_full_name),
    lower(trim(p_email)),
    crypt(p_password, gen_salt('bf')),
    p_role,
    nullif(trim(p_organization), '')
  )
  returning * into v_user;

  return v_user;
end;
$$;

create or replace function public.verify_app_user_login(
  p_email text,
  p_password text
)
returns table (
  id uuid,
  full_name text,
  email text,
  role public.app_role,
  organization text,
  is_active boolean
)
language plpgsql
security definer
as $$
begin
  return query
  select
    u.id,
    u.full_name,
    u.email,
    u.role,
    u.organization,
    u.is_active
  from public.app_users u
  where u.email = lower(trim(p_email))
    and u.is_active = true
    and u.password_hash = crypt(p_password, u.password_hash);

  update public.app_users
  set last_login_at = now()
  where app_users.email = lower(trim(p_email))
    and app_users.is_active = true
    and app_users.password_hash = crypt(p_password, app_users.password_hash);
end;
$$;

alter table public.app_users enable row level security;

drop policy if exists "service role full access app_users" on public.app_users;
create policy "service role full access app_users"
on public.app_users
for all
to service_role
using (true)
with check (true);

revoke all on public.app_users from anon, authenticated;
revoke all on function public.create_app_user(text, text, text, public.app_role, text) from public, anon, authenticated;
revoke all on function public.verify_app_user_login(text, text) from public, anon, authenticated;

grant execute on function public.create_app_user(text, text, text, public.app_role, text) to service_role;
grant execute on function public.verify_app_user_login(text, text) to service_role;

-- Optional seed users for local testing
-- select public.create_app_user('Admin User', 'admin@snehaasha.org', 'Admin@123', 'ADMIN', 'Sneha Asha Foundation');
-- select public.create_app_user('Project Manager', 'manager@snehaasha.org', 'Manager@123', 'PROJECT_MANAGER', 'Sneha Asha Foundation');
