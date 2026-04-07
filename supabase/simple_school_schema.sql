create extension if not exists "pgcrypto";

create table if not exists academic_years (
  id uuid primary key default gen_random_uuid(),
  year_name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  class_name text not null,
  section_name text not null,
  academic_year_id uuid not null references academic_years(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (class_name, section_name, academic_year_id)
);

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  pen text not null unique,
  student_name text not null,
  gender text,
  date_of_birth date,
  class_id uuid not null references classes(id) on delete cascade,
  school_name text,
  guardian_name text,
  guardian_phone text,
  aadhaar_verified boolean not null default false,
  entry_status text default 'Draft',
  is_new_student boolean not null default false,
  updated_on timestamptz,
  updated_by text,
  updated_by_id text,
  created_at timestamptz not null default now()
);

create table if not exists student_profiles (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references students(id) on delete cascade,
  general_profile jsonb default '{}'::jsonb,
  enrolment_profile jsonb default '{}'::jsonb,
  facility_profile jsonb default '{}'::jsonb,
  preview_profile jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists student_scholarships (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  program_name text,
  approved_amount numeric(12,2) default 0,
  received_amount numeric(12,2) default 0,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_classes_year on classes(academic_year_id);
create index if not exists idx_students_class on students(class_id);
create index if not exists idx_students_pen on students(pen);
create index if not exists idx_student_scholarships_student on student_scholarships(student_id);

insert into academic_years (year_name, is_active)
values ('2025-26', true)
on conflict (year_name) do nothing;

create or replace view class_summary_view as
select
  c.id as class_id,
  c.class_name,
  count(s.id) filter (where lower(coalesce(s.gender, '')) = 'male') as boys,
  count(s.id) filter (where lower(coalesce(s.gender, '')) = 'female') as girls,
  count(s.id) filter (where lower(coalesce(s.gender, '')) = 'transgender') as transgender,
  count(s.id) as total_students,
  count(s.id) filter (where coalesce(s.entry_status, 'Draft') <> 'Completed') as incomplete_students
from classes c
left join students s on s.class_id = c.id
group by c.id, c.class_name;

create or replace view section_summary_view as
select
  c.id as class_id,
  c.class_name,
  c.section_name,
  count(s.id) filter (where lower(coalesce(s.gender, '')) = 'male') as boys,
  count(s.id) filter (where lower(coalesce(s.gender, '')) = 'female') as girls,
  count(s.id) filter (where lower(coalesce(s.gender, '')) = 'transgender') as transgender,
  count(s.id) as total_students,
  count(s.id) filter (where coalesce(s.entry_status, 'Draft') <> 'Completed') as incomplete_students
from classes c
left join students s on s.class_id = c.id
group by c.id, c.class_name, c.section_name;
