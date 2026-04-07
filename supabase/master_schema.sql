-- Scholarship master schema for Supabase/Postgres
-- Generated from workbook: MS - Scholarship .xlsx
-- Workbook tabs detected:
--   1. Summary Dashboard
--   2. All Batch
--   3. Batch - 2
--   4. Batch - 3
--
-- Notes:
-- - The Excel workbook contains a repeated student master structure across batches.
-- - Some header cells in the workbook are merged/styled in a way that obscures exact text.
-- - This schema keeps the data normalized and production-friendly for Supabase.
-- - A raw import table is also included so no original workbook fields are lost during migration.

create extension if not exists "pgcrypto";

create schema if not exists master;

create type master.gender_type as enum ('male', 'female', 'other', 'unknown');
create type master.scholarship_component_type as enum (
  'college_fee',
  'coaching_fee',
  'sports_gym',
  'books_stationery',
  'transport',
  'exam_fee',
  'hostel',
  'other'
);

create type master.academic_stage_type as enum (
  'ssc',
  '11th',
  '12th',
  'ug_year_1',
  'ug_year_2',
  'ug_year_3',
  'ug_year_4',
  'pg_year_1',
  'pg_year_2',
  'other'
);

create table if not exists master.batches (
  id uuid primary key default gen_random_uuid(),
  batch_code text not null unique,
  batch_name text not null,
  academic_year text,
  sort_order integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists master.students (
  id uuid primary key default gen_random_uuid(),
  uid text not null unique,
  batch_id uuid references master.batches(id) on delete set null,
  batch_student_number integer,
  full_name text not null,
  gender master.gender_type not null default 'unknown',
  date_of_birth date,
  age_years integer,
  student_contact_no text,
  parent_contact_no text,
  address_line text,
  school_name text,
  ssc_score_text text,
  ssc_percentage numeric(5,2),
  year_of_passing_ssc integer,
  future_goal text,
  college_name_11th text,
  enrolled_in_11th boolean,
  coaching_class_name text,
  current_status text,
  remarks text,
  total_scholarship_amount numeric(14,2) not null default 0,
  source_sheet text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_students_batch_id on master.students(batch_id);
create index if not exists idx_students_full_name on master.students(full_name);
create index if not exists idx_students_uid on master.students(uid);

create table if not exists master.student_academic_details (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references master.students(id) on delete cascade,
  school_board text,
  school_medium text,
  class_10_school_name text,
  class_11_college_name text,
  class_12_college_name text,
  graduation_college_name text,
  professional_track text,
  target_course text,
  target_exam text,
  coaching_required boolean,
  coaching_provider_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists master.student_guardians (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references master.students(id) on delete cascade,
  guardian_name text,
  relationship_to_student text,
  contact_no text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_student_guardians_student_id on master.student_guardians(student_id);

create table if not exists master.scholarship_components (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references master.students(id) on delete cascade,
  academic_stage master.academic_stage_type not null,
  component_type master.scholarship_component_type not null,
  component_label text,
  amount numeric(14,2) not null default 0,
  notes text,
  source_column text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scholarship_components_unique unique (student_id, academic_stage, component_type, coalesce(component_label, ''))
);

create index if not exists idx_scholarship_components_student_id on master.scholarship_components(student_id);
create index if not exists idx_scholarship_components_stage on master.scholarship_components(academic_stage);

create table if not exists master.student_yearly_totals (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references master.students(id) on delete cascade,
  academic_stage master.academic_stage_type not null,
  total_amount numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_yearly_totals_unique unique (student_id, academic_stage)
);

create table if not exists master.summary_dashboard_metrics (
  id uuid primary key default gen_random_uuid(),
  metric_group text not null,
  metric_name text not null,
  metric_value numeric(14,2),
  metric_text text,
  reporting_year text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Raw landing table for exact Excel-to-database import.
-- Use this first if you want a zero-loss import before cleaning the data.
create table if not exists master.student_import_raw (
  id uuid primary key default gen_random_uuid(),
  source_sheet text not null,
  source_row_number integer,
  uid text,
  student_name text,
  batch_value text,
  gender text,
  date_of_birth_text text,
  age_text text,
  address_text text,
  student_contact_text text,
  parent_contact_text text,
  school_name_text text,
  ssc_score_text text,
  year_of_passing_ssc_text text,
  future_goal_text text,
  college_name_11th_text text,
  enrolled_in_11th_text text,
  coaching_class_name_text text,
  amount_11th_college_text text,
  amount_12th_college_text text,
  amount_ug_year_1_college_text text,
  amount_ug_year_2_college_text text,
  amount_ug_year_1_coaching_text text,
  amount_ug_year_2_coaching_text text,
  amount_ug_year_1_sports_gym_text text,
  amount_ug_year_2_sports_gym_text text,
  amount_other_1_text text,
  amount_other_2_text text,
  amount_other_3_text text,
  total_amount_text text,
  raw_payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_student_import_raw_sheet on master.student_import_raw(source_sheet);
create index if not exists idx_student_import_raw_uid on master.student_import_raw(uid);

create or replace function master.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_batches_updated_at on master.batches;
create trigger trg_batches_updated_at
before update on master.batches
for each row
execute function master.set_updated_at();

drop trigger if exists trg_students_updated_at on master.students;
create trigger trg_students_updated_at
before update on master.students
for each row
execute function master.set_updated_at();

drop trigger if exists trg_student_academic_details_updated_at on master.student_academic_details;
create trigger trg_student_academic_details_updated_at
before update on master.student_academic_details
for each row
execute function master.set_updated_at();

drop trigger if exists trg_scholarship_components_updated_at on master.scholarship_components;
create trigger trg_scholarship_components_updated_at
before update on master.scholarship_components
for each row
execute function master.set_updated_at();

drop trigger if exists trg_student_yearly_totals_updated_at on master.student_yearly_totals;
create trigger trg_student_yearly_totals_updated_at
before update on master.student_yearly_totals
for each row
execute function master.set_updated_at();

drop trigger if exists trg_summary_dashboard_metrics_updated_at on master.summary_dashboard_metrics;
create trigger trg_summary_dashboard_metrics_updated_at
before update on master.summary_dashboard_metrics
for each row
execute function master.set_updated_at();

-- Optional seed for current workbook batches
insert into master.batches (batch_code, batch_name, academic_year, sort_order)
values
  ('BATCH_1', 'All Batch', '2025-26', 1),
  ('BATCH_2', 'Batch - 2', '2025-26', 2),
  ('BATCH_3', 'Batch - 3', '2025-26', 3)
on conflict (batch_code) do nothing;

-- Recommended Row Level Security starter setup
alter table master.batches enable row level security;
alter table master.students enable row level security;
alter table master.student_academic_details enable row level security;
alter table master.student_guardians enable row level security;
alter table master.scholarship_components enable row level security;
alter table master.student_yearly_totals enable row level security;
alter table master.summary_dashboard_metrics enable row level security;
alter table master.student_import_raw enable row level security;

-- Replace these starter policies with role-specific policies once auth is finalized.
drop policy if exists "authenticated read batches" on master.batches;
create policy "authenticated read batches"
on master.batches for select
to authenticated
using (true);

drop policy if exists "authenticated read students" on master.students;
create policy "authenticated read students"
on master.students for select
to authenticated
using (true);

drop policy if exists "authenticated read student academic details" on master.student_academic_details;
create policy "authenticated read student academic details"
on master.student_academic_details for select
to authenticated
using (true);

drop policy if exists "authenticated read student guardians" on master.student_guardians;
create policy "authenticated read student guardians"
on master.student_guardians for select
to authenticated
using (true);

drop policy if exists "authenticated read scholarship components" on master.scholarship_components;
create policy "authenticated read scholarship components"
on master.scholarship_components for select
to authenticated
using (true);

drop policy if exists "authenticated read yearly totals" on master.student_yearly_totals;
create policy "authenticated read yearly totals"
on master.student_yearly_totals for select
to authenticated
using (true);

drop policy if exists "authenticated read summary dashboard metrics" on master.summary_dashboard_metrics;
create policy "authenticated read summary dashboard metrics"
on master.summary_dashboard_metrics for select
to authenticated
using (true);

drop policy if exists "authenticated manage import raw" on master.student_import_raw;
create policy "authenticated manage import raw"
on master.student_import_raw for all
to authenticated
using (true)
with check (true);
