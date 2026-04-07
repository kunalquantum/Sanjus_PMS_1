-- Basic login/register table for quick setup
-- No RLS, no extra dependencies beyond pgcrypto
-- Intended only as a simple starter so auth can work first

create extension if not exists "pgcrypto";

drop function if exists public.basic_register_user(text, text, text, text);
drop function if exists public.basic_login_user(text, text);

create table if not exists public.app_users_basic (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  password_hash text not null,
  role text not null default 'STUDENT',
  created_at timestamptz not null default now()
);

create index if not exists idx_app_users_basic_email
on public.app_users_basic(email);

create or replace function public.basic_register_user(
  p_full_name text,
  p_email text,
  p_password text,
  p_role text default 'STUDENT'
)
returns table (
  id uuid,
  full_name text,
  email text,
  role text
)
language plpgsql
security definer
as $$
declare
  v_inserted public.app_users_basic;
begin
  insert into public.app_users_basic (
    full_name,
    email,
    password_hash,
    role
  )
  values (
    trim(p_full_name),
    lower(trim(p_email)),
    crypt(p_password, gen_salt('bf')),
    upper(trim(coalesce(p_role, 'STUDENT')))
  )
  returning * into v_inserted;

  return query
  select
    v_inserted.id,
    v_inserted.full_name,
    v_inserted.email,
    v_inserted.role;
end;
$$;

create or replace function public.basic_login_user(
  p_email text,
  p_password text
)
returns table (
  id uuid,
  full_name text,
  email text,
  role text
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
    u.role
  from public.app_users_basic u
  where u.email = lower(trim(p_email))
    and u.password_hash = crypt(p_password, u.password_hash)
  limit 1;
end;
$$;

grant all on table public.app_users_basic to postgres, service_role;
grant execute on function public.basic_register_user(text, text, text, text) to postgres, service_role;
grant execute on function public.basic_login_user(text, text) to postgres, service_role;

-- Test example:
-- select * from public.basic_register_user('Admin User', 'admin@snehaasha.org', 'Admin@123', 'ADMIN');
-- select * from public.basic_login_user('admin@snehaasha.org', 'Admin@123');
