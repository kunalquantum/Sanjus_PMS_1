-- School-style student master schema for Supabase/Postgres
-- Based on the client UI pattern:
-- 1. Class/grade summary
-- 2. Section-wise summary under each class
-- 3. Student listing by class + section
-- 4. Student detail tabs:
--    - General Profile
--    - Enrolment Profile
--    - Facility Profile
--    - Profile Preview / completion state

create extension if not exists "pgcrypto";

create schema if not exists school_master;

create type school_master.gender_type as enum ('male', 'female', 'transgender', 'other', 'unknown');
create type school_master.entry_status_type as enum ('draft', 'in_progress', 'completed', 'inactive');
create type school_master.verification_status_type as enum ('pending', 'verified', 'rejected');

create table if not exists school_master.academic_years (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  start_date date,
  end_date date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists school_master.classes (
  id uuid primary key default gen_random_uuid(),
  class_code text not null unique,
  class_name text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists school_master.sections (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references school_master.classes(id) on delete cascade,
  section_code text not null,
  section_alias text,
  display_name text not null,
  capacity integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sections_unique unique (class_id, section_code)
);

create index if not exists idx_sections_class_id on school_master.sections(class_id);

create table if not exists school_master.students (
  id uuid primary key default gen_random_uuid(),
  pen text not null unique,
  academic_year_id uuid not null references school_master.academic_years(id) on delete restrict,
  class_id uuid not null references school_master.classes(id) on delete restrict,
  section_id uuid not null references school_master.sections(id) on delete restrict,
  student_name text not null,
  gender school_master.gender_type not null default 'unknown',
  date_of_birth date,
  entry_status school_master.entry_status_type not null default 'draft',
  aadhaar_verification_status school_master.verification_status_type not null default 'pending',
  is_incomplete boolean not null default true,
  is_new_student boolean not null default false,
  last_updated_at timestamptz,
  last_updated_by_user_id text,
  last_updated_by_name text,
  remarks text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_students_class_id on school_master.students(class_id);
create index if not exists idx_students_section_id on school_master.students(section_id);
create index if not exists idx_students_academic_year_id on school_master.students(academic_year_id);
create index if not exists idx_students_name on school_master.students(student_name);

create table if not exists school_master.student_general_profiles (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references school_master.students(id) on delete cascade,
  student_name_as_record text,
  gender_as_record school_master.gender_type,
  date_of_birth_as_record date,
  permanent_education_number text,
  aadhaar_number text,
  aadhaar_verified boolean not null default false,
  blood_group text,
  religion text,
  caste_category text,
  mother_tongue text,
  nationality text,
  address_line_1 text,
  address_line_2 text,
  city text,
  district text,
  state text,
  pincode text,
  student_mobile text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists school_master.student_enrolment_profiles (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references school_master.students(id) on delete cascade,
  admission_number text,
  admission_date date,
  admission_type text,
  school_udise_code text,
  school_name text,
  class_name_at_admission text,
  section_name_at_admission text,
  roll_number text,
  medium_of_instruction text,
  previous_school_name text,
  transfer_certificate_number text,
  rte_flag boolean,
  minority_flag boolean,
  disability_flag boolean,
  dropout_risk_flag boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists school_master.student_facility_profiles (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references school_master.students(id) on delete cascade,
  hostel_required boolean,
  hostel_allocated boolean,
  transport_required boolean,
  transport_allocated boolean,
  mid_day_meal_eligible boolean,
  scholarship_eligible boolean,
  scholarship_name text,
  device_allocated boolean,
  uniform_issued boolean,
  books_issued boolean,
  sports_support boolean,
  special_support_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists school_master.student_profile_completion (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references school_master.students(id) on delete cascade,
  general_profile_complete boolean not null default false,
  enrolment_profile_complete boolean not null default false,
  facility_profile_complete boolean not null default false,
  preview_complete boolean not null default false,
  overall_completion_percent numeric(5,2) not null default 0,
  overall_status school_master.entry_status_type not null default 'draft',
  completed_at timestamptz,
  completed_by_user_id text,
  completed_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists school_master.student_actions_audit (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references school_master.students(id) on delete cascade,
  action_code text not null,
  action_label text not null,
  action_by_user_id text,
  action_by_name text,
  action_at timestamptz not null default now(),
  action_notes text
);

create index if not exists idx_student_actions_audit_student_id on school_master.student_actions_audit(student_id);

create view school_master.v_class_summary as
select
  c.id as class_id,
  c.class_name as class_grade,
  count(s.id) filter (where st.gender = 'male') as boys,
  count(s.id) filter (where st.gender = 'female') as girls,
  count(s.id) filter (where st.gender = 'transgender') as transgender,
  count(s.id) as total_students,
  count(s.id) filter (where st.is_incomplete = true) as incomplete_students
from school_master.classes c
left join school_master.students st on st.class_id = c.id
left join school_master.sections s on s.id = st.section_id
group by c.id, c.class_name;

create view school_master.v_section_summary as
select
  c.id as class_id,
  c.class_name as class_grade,
  sec.id as section_id,
  sec.display_name as section_alias,
  count(st.id) filter (where st.gender = 'male') as boys,
  count(st.id) filter (where st.gender = 'female') as girls,
  count(st.id) filter (where st.gender = 'transgender') as transgender,
  count(st.id) as total_students,
  count(st.id) filter (where st.is_incomplete = true) as incomplete_students
from school_master.sections sec
join school_master.classes c on c.id = sec.class_id
left join school_master.students st on st.section_id = sec.id
group by c.id, c.class_name, sec.id, sec.display_name;

create or replace function school_master.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_academic_years_updated_at on school_master.academic_years;
create trigger trg_academic_years_updated_at
before update on school_master.academic_years
for each row execute function school_master.set_updated_at();

drop trigger if exists trg_classes_updated_at on school_master.classes;
create trigger trg_classes_updated_at
before update on school_master.classes
for each row execute function school_master.set_updated_at();

drop trigger if exists trg_sections_updated_at on school_master.sections;
create trigger trg_sections_updated_at
before update on school_master.sections
for each row execute function school_master.set_updated_at();

drop trigger if exists trg_students_updated_at on school_master.students;
create trigger trg_students_updated_at
before update on school_master.students
for each row execute function school_master.set_updated_at();

drop trigger if exists trg_student_general_profiles_updated_at on school_master.student_general_profiles;
create trigger trg_student_general_profiles_updated_at
before update on school_master.student_general_profiles
for each row execute function school_master.set_updated_at();

drop trigger if exists trg_student_enrolment_profiles_updated_at on school_master.student_enrolment_profiles;
create trigger trg_student_enrolment_profiles_updated_at
before update on school_master.student_enrolment_profiles
for each row execute function school_master.set_updated_at();

drop trigger if exists trg_student_facility_profiles_updated_at on school_master.student_facility_profiles;
create trigger trg_student_facility_profiles_updated_at
before update on school_master.student_facility_profiles
for each row execute function school_master.set_updated_at();

drop trigger if exists trg_student_profile_completion_updated_at on school_master.student_profile_completion;
create trigger trg_student_profile_completion_updated_at
before update on school_master.student_profile_completion
for each row execute function school_master.set_updated_at();

insert into school_master.academic_years (code, label, is_active)
values ('2025-26', '2025-26', true)
on conflict (code) do nothing;

insert into school_master.classes (class_code, class_name, display_order)
values
  ('NURSERY_PP3', 'Nursery/PP3', 1),
  ('JR_KG_PP2', 'JR KG/PP2', 2),
  ('SR_KG_PP1', 'Sr KG/PP1', 3),
  ('GRADE_1', 'Grade 1', 4),
  ('GRADE_2', 'Grade 2', 5),
  ('GRADE_3', 'Grade 3', 6),
  ('GRADE_4', 'Grade 4', 7),
  ('GRADE_5', 'Grade 5', 8),
  ('GRADE_6', 'Grade 6', 9),
  ('GRADE_7', 'Grade 7', 10),
  ('GRADE_8', 'Grade 8', 11),
  ('GRADE_9', 'Grade 9', 12),
  ('GRADE_10', 'Grade 10', 13)
on conflict (class_code) do nothing;

alter table school_master.academic_years enable row level security;
alter table school_master.classes enable row level security;
alter table school_master.sections enable row level security;
alter table school_master.students enable row level security;
alter table school_master.student_general_profiles enable row level security;
alter table school_master.student_enrolment_profiles enable row level security;
alter table school_master.student_facility_profiles enable row level security;
alter table school_master.student_profile_completion enable row level security;
alter table school_master.student_actions_audit enable row level security;

drop policy if exists "authenticated read academic years" on school_master.academic_years;
create policy "authenticated read academic years"
on school_master.academic_years for select
to authenticated
using (true);

drop policy if exists "authenticated read classes" on school_master.classes;
create policy "authenticated read classes"
on school_master.classes for select
to authenticated
using (true);

drop policy if exists "authenticated read sections" on school_master.sections;
create policy "authenticated read sections"
on school_master.sections for select
to authenticated
using (true);

drop policy if exists "authenticated read students" on school_master.students;
create policy "authenticated read students"
on school_master.students for select
to authenticated
using (true);

drop policy if exists "authenticated read student general profiles" on school_master.student_general_profiles;
create policy "authenticated read student general profiles"
on school_master.student_general_profiles for select
to authenticated
using (true);

drop policy if exists "authenticated read student enrolment profiles" on school_master.student_enrolment_profiles;
create policy "authenticated read student enrolment profiles"
on school_master.student_enrolment_profiles for select
to authenticated
using (true);

drop policy if exists "authenticated read student facility profiles" on school_master.student_facility_profiles;
create policy "authenticated read student facility profiles"
on school_master.student_facility_profiles for select
to authenticated
using (true);

drop policy if exists "authenticated read student completion" on school_master.student_profile_completion;
create policy "authenticated read student completion"
on school_master.student_profile_completion for select
to authenticated
using (true);

drop policy if exists "authenticated read student audit" on school_master.student_actions_audit;
create policy "authenticated read student audit"
on school_master.student_actions_audit for select
to authenticated
using (true);
