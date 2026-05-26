-- ============================================================================
-- SCHOOL CONNECT - Full Database Setup
-- Paste this ENTIRE file into Supabase Dashboard SQL Editor and RUN
-- Order: 1) Schema + RLS + Triggers, 2) Teacher Drive, 3) Attachments, 4) Seed
-- ============================================================================



-- ============================================================================
-- PART 1: BASE SCHEMA (from 00001_schema.sql)
-- Tables: schools, profiles, classes, enrollments, attendance_records,
--         conversations, conversation_participants, messages, announcements,
--         attendance_alerts + RLS policies + absence alert trigger
-- ============================================================================

-- 0. EXTENSIONS
create extension if not exists "pgcrypto";

-- ============================================================================
-- 1. TENANT: SCHOOLS
-- ============================================================================
create table schools (
    id          bigint generated always as identity primary key,
    name        text not null,
    slug        text not null unique,
    address     text,
    phone       text,
    timezone    text not null default 'UTC',
    academic_year text,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

create index schools_slug_idx on schools (slug);

-- ============================================================================
-- 2. PROFILES (extends Supabase auth.users)
-- ============================================================================
create table profiles (
    id          bigint generated always as identity primary key,
    user_id     uuid not null unique references auth.users(id) on delete cascade,
    school_id   bigint not null references schools(id) on delete cascade,
    role        text not null check (role in ('principal', 'teacher', 'parent', 'student')),
    full_name   text not null,
    email       text not null,
    phone       text,
    avatar_url  text,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

create index profiles_user_id_idx on profiles (user_id);
create index profiles_school_id_idx on profiles (school_id);
create index profiles_role_idx on profiles (role);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.profiles (user_id, school_id, role, full_name, email)
    values (
        new.id,
        (new.raw_user_meta_data ->> 'school_id')::bigint,
        coalesce(new.raw_user_meta_data ->> 'role', 'parent'),
        coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
        new.email
    );
    return new;
end;
$$;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function handle_new_user();

-- ============================================================================
-- 3. CLASSES
-- ============================================================================
create table classes (
    id          bigint generated always as identity primary key,
    school_id   bigint not null references schools(id) on delete cascade,
    name        text not null,
    grade       text,
    section     text,
    teacher_id  bigint references profiles(id) on delete set null,
    academic_year text,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

create index classes_school_id_idx on classes (school_id);
create index classes_teacher_id_idx on classes (teacher_id);

-- ============================================================================
-- 4. ENROLLMENTS (Student <-> Class, with optional parent link)
-- ============================================================================
create table enrollments (
    id          bigint generated always as identity primary key,
    class_id    bigint not null references classes(id) on delete cascade,
    student_id  bigint not null references profiles(id) on delete cascade,
    parent_id   bigint references profiles(id) on delete set null,
    created_at  timestamptz not null default now(),
    unique(class_id, student_id)
);

create index enrollments_class_id_idx on enrollments (class_id);
create index enrollments_student_id_idx on enrollments (student_id);
create index enrollments_parent_id_idx on enrollments (parent_id);

-- ============================================================================
-- 5. ATTENDANCE RECORDS
-- ============================================================================
create table attendance_records (
    id              bigint generated always as identity primary key,
    class_id        bigint not null references classes(id) on delete cascade,
    student_id      bigint not null references profiles(id) on delete cascade,
    date            date not null,
    status          text not null check (status in ('present', 'absent', 'late', 'excused')),
    marked_by       bigint not null references profiles(id),
    notes           text,
    parent_notified boolean not null default false,
    notified_at     timestamptz,
    created_at      timestamptz not null default now(),
    unique(student_id, date)
);

create index attendance_records_class_id_idx on attendance_records (class_id);
create index attendance_records_student_id_idx on attendance_records (student_id);
create index attendance_records_date_idx on attendance_records (date);
create index attendance_records_status_idx on attendance_records (status);
create index attendance_records_marked_by_idx on attendance_records (marked_by);

-- ============================================================================
-- 6. CONVERSATIONS (Messaging threads)
-- ============================================================================
create table conversations (
    id          bigint generated always as identity primary key,
    school_id   bigint not null references schools(id) on delete cascade,
    subject     text,
    created_at  timestamptz not null default now()
);

create index conversations_school_id_idx on conversations (school_id);

-- ============================================================================
-- 7. CONVERSATION PARTICIPANTS
-- ============================================================================
create table conversation_participants (
    id              bigint generated always as identity primary key,
    conversation_id bigint not null references conversations(id) on delete cascade,
    profile_id      bigint not null references profiles(id) on delete cascade,
    last_read_at    timestamptz,
    created_at      timestamptz not null default now(),
    unique(conversation_id, profile_id)
);

create index conv_participants_conv_id_idx on conversation_participants (conversation_id);
create index conv_participants_profile_id_idx on conversation_participants (profile_id);

-- ============================================================================
-- 8. MESSAGES
-- ============================================================================
create table messages (
    id              bigint generated always as identity primary key,
    conversation_id bigint not null references conversations(id) on delete cascade,
    sender_id       bigint not null references profiles(id),
    body            text not null,
    created_at      timestamptz not null default now()
);

create index messages_conversation_id_idx on messages (conversation_id);
create index messages_sender_id_idx on messages (sender_id);
create index messages_created_at_idx on messages (created_at);

-- ============================================================================
-- 9. ANNOUNCEMENTS (School broadcasts)
-- ============================================================================
create table announcements (
    id            bigint generated always as identity primary key,
    school_id     bigint not null references schools(id) on delete cascade,
    author_id     bigint not null references profiles(id),
    title         text not null,
    body          text not null,
    priority      text not null default 'normal'
                  check (priority in ('low', 'normal', 'high', 'emergency')),
    target_roles  text[] not null default array['all'],
    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now()
);

create index announcements_school_id_idx on announcements (school_id);
create index announcements_author_id_idx on announcements (author_id);
create index announcements_priority_idx on announcements (priority);
create index announcements_created_at_idx on announcements (created_at desc);

-- ============================================================================
-- 10. ATTENDANCE ALERTS (Log of parent notifications)
-- ============================================================================
create table attendance_alerts (
    id              bigint generated always as identity primary key,
    attendance_id   bigint not null references attendance_records(id) on delete cascade,
    student_id      bigint not null references profiles(id) on delete cascade,
    parent_id       bigint not null references profiles(id),
    sent_at         timestamptz not null default now(),
    method          text not null default 'in_app' check (method in ('in_app', 'email', 'sms')),
    read_at         timestamptz
);

create index attendance_alerts_attendance_id_idx on attendance_alerts (attendance_id);
create index attendance_alerts_parent_id_idx on attendance_alerts (parent_id);
create index attendance_alerts_student_id_idx on attendance_alerts (student_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- 10a. Helper: Get current user's school_id (security definer, cached)
create or replace function get_school_id()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
    select school_id from public.profiles where user_id = (select auth.uid());
$$;

-- 10b. Helper: Get current user's profile_id
create or replace function get_profile_id()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
    select id from public.profiles where user_id = (select auth.uid());
$$;

-- 10c. Helper: Get current user's role
create or replace function get_my_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
    select role from public.profiles where user_id = (select auth.uid());
$$;

-- 10d. Helper: Check if a profile belongs to current user's school
create or replace function is_same_school(target_profile_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select (select public.get_school_id()) = school_id
    from public.profiles
    where id = target_profile_id;
$$;

-- ============================================================================
-- RLS: SCHOOLS
-- ============================================================================
alter table schools enable row level security;

create policy "Users can view their own school"
    on schools for select
    to authenticated
    using (id = (select get_school_id()));

create policy "Super-admins can manage schools"
    on schools for all
    to authenticated
    using (false)
    with check (false);

-- ============================================================================
-- RLS: PROFILES
-- ============================================================================
alter table profiles enable row level security;

create policy "Users can view profiles in their school"
    on profiles for select
    to authenticated
    using (school_id = (select get_school_id()));

create policy "Users can update their own profile"
    on profiles for update
    to authenticated
    using (user_id = (select auth.uid()))
    with check (user_id = (select auth.uid()));

create policy "Users can insert their own profile"
    on profiles for insert
    to authenticated
    with check (user_id = (select auth.uid()));

-- ============================================================================
-- RLS: CLASSES
-- ============================================================================
alter table classes enable row level security;

create policy "School isolation - classes"
    on classes for all
    to authenticated
    using (school_id = (select get_school_id()));

-- ============================================================================
-- RLS: ENROLLMENTS
-- ============================================================================
alter table enrollments enable row level security;

create policy "View enrollments in school"
    on enrollments for select
    to authenticated
    using (
        (select get_school_id()) = (select c.school_id from classes c where c.id = class_id)
        and (
            (select get_my_role()) in ('principal', 'teacher')
            or parent_id = (select get_profile_id())
            or student_id = (select get_profile_id())
        )
    );

create policy "Manage enrollments - teachers and principals"
    on enrollments for insert
    to authenticated
    with check (
        (select get_my_role()) in ('principal', 'teacher')
        and (select get_school_id()) = (select c.school_id from classes c where c.id = class_id)
    );

create policy "Manage enrollments - teachers and principals update"
    on enrollments for update
    to authenticated
    using (
        (select get_my_role()) in ('principal', 'teacher')
        and (select get_school_id()) = (select c.school_id from classes c where c.id = class_id)
    );

-- ============================================================================
-- RLS: ATTENDANCE RECORDS
-- ============================================================================
alter table attendance_records enable row level security;

create policy "Teachers and principals manage attendance"
    on attendance_records for insert
    to authenticated
    with check (
        (select get_my_role()) in ('teacher', 'principal')
        and (select get_school_id()) = (select c.school_id from classes c where c.id = class_id)
    );

create policy "Teachers and principals update attendance"
    on attendance_records for update
    to authenticated
    using (
        (select get_my_role()) in ('teacher', 'principal')
        and (select get_school_id()) = (select c.school_id from classes c where c.id = class_id)
    );

create policy "View attendance - school members"
    on attendance_records for select
    to authenticated
    using (
        (select get_school_id()) = (select c.school_id from classes c where c.id = class_id)
        and (
            (select get_my_role()) in ('principal', 'teacher')
            or student_id = (select get_profile_id())
            or exists (
                select 1 from enrollments e
                where e.student_id = attendance_records.student_id
                and e.parent_id = (select get_profile_id())
            )
        )
    );

-- ============================================================================
-- RLS: CONVERSATIONS
-- ============================================================================
alter table conversations enable row level security;

create policy "School isolation - conversations"
    on conversations for all
    to authenticated
    using (school_id = (select get_school_id()));

-- ============================================================================
-- RLS: CONVERSATION PARTICIPANTS
-- ============================================================================
alter table conversation_participants enable row level security;

create or replace function public.is_conversation_participant(conv_id bigint, prof_id bigint)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
    select exists (
        select 1 from public.conversation_participants
        where conversation_id = conv_id and profile_id = prof_id
    );
$$;

create policy "Users see all participants of conversations they are in"
    on conversation_participants for select
    to authenticated
    using (public.is_conversation_participant(conversation_id, public.get_profile_id()));

create policy "Participants can add others to their conversations"
    on conversation_participants for insert
    to authenticated
    with check ( (select public.get_school_id()) = (select c.school_id from public.conversations c where c.id = conversation_id) );

-- ============================================================================
-- RLS: MESSAGES
-- ============================================================================
alter table messages enable row level security;

create policy "Participants can read messages in their conversations"
    on messages for select
    to authenticated
    using (
        exists (
            select 1 from conversation_participants cp
            where cp.conversation_id = messages.conversation_id
            and cp.profile_id = (select get_profile_id())
        )
    );

create policy "Participants can send messages"
    on messages for insert
    to authenticated
    with check (
        sender_id = (select get_profile_id())
        and exists (
            select 1 from conversation_participants cp
            where cp.conversation_id = messages.conversation_id
            and cp.profile_id = (select get_profile_id())
        )
    );

-- ============================================================================
-- RLS: ANNOUNCEMENTS
-- ============================================================================
alter table announcements enable row level security;

create policy "Principals manage announcements"
    on announcements for insert
    to authenticated
    with check (
        (select get_my_role()) = 'principal'
        and school_id = (select get_school_id())
    );

create policy "Principals update their announcements"
    on announcements for update
    to authenticated
    using (
        (select get_my_role()) = 'principal'
        and school_id = (select get_school_id())
    );

create policy "Everyone in school views announcements"
    on announcements for select
    to authenticated
    using (school_id = (select get_school_id()));

-- ============================================================================
-- RLS: ATTENDANCE ALERTS
-- ============================================================================
alter table attendance_alerts enable row level security;

create policy "Parents view their own alerts"
    on attendance_alerts for select
    to authenticated
    using (parent_id = (select get_profile_id()));

create policy "Teachers/principals view alerts for their students"
    on attendance_alerts for select
    to authenticated
    using (
        (select get_my_role()) in ('teacher', 'principal')
        and exists (
            select 1 from attendance_records ar
            join classes c on c.id = ar.class_id
            where ar.id = attendance_alerts.attendance_id
            and c.school_id = (select get_school_id())
        )
    );

create policy "System inserts alerts"
    on attendance_alerts for insert
    to authenticated
    with check (true);

-- ============================================================================
-- FUNCTION: Auto-notify parent on unexcused absence
-- ============================================================================
create or replace function notify_parent_on_absence()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_parent_id bigint;
begin
    if new.status = 'absent' and new.parent_notified = false then
        select e.parent_id into v_parent_id
        from public.enrollments e
        where e.student_id = new.student_id
          and e.parent_id is not null
        limit 1;

        if v_parent_id is not null then
            insert into public.attendance_alerts (attendance_id, student_id, parent_id, method)
            values (new.id, new.student_id, v_parent_id, 'in_app');

            update public.attendance_records
            set parent_notified = true, notified_at = now()
            where id = new.id;
        end if;
    end if;
    return new;
end;
$$;

create trigger after_attendance_absent
    after insert on attendance_records
    for each row
    when (new.status = 'absent')
    execute function notify_parent_on_absence();

-- ============================================================================
-- GRANTS (Least privilege)
-- ============================================================================
revoke all on schema public from public;

grant usage on schema public to authenticated;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage on all sequences in schema public to authenticated;

alter default privileges for role postgres in schema public
    grant select, insert, update, delete on tables to authenticated;

alter default privileges for role postgres in schema public
    grant usage on sequences to authenticated;



-- ============================================================================
-- PART 2: TEACHER DRIVE (from 00002_teacher_drive.sql)
-- Tables: folders, resources + Storage bucket + RLS
-- ============================================================================

-- 1. FOLDERS TABLE
create table public.folders (
    id bigint generated always as identity primary key,
    school_id bigint not null references public.schools(id) on delete cascade,
    class_id bigint not null references public.classes(id) on delete cascade,
    name text not null,
    created_by bigint not null references public.profiles(id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index folders_class_id_idx on public.folders (class_id);
create index folders_school_id_idx on public.folders (school_id);

-- 2. RESOURCES TABLE
create table public.resources (
    id bigint generated always as identity primary key,
    folder_id bigint not null references public.folders(id) on delete cascade,
    name text not null,
    storage_path text not null unique,
    size_bytes bigint not null,
    content_type text not null,
    created_by bigint not null references public.profiles(id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index resources_folder_id_idx on public.resources (folder_id);

-- 3. RLS POLICIES FOR FOLDERS
alter table public.folders enable row level security;

create policy "Teachers manage class folders"
    on public.folders for all
    to authenticated
    using (
        (select public.get_my_role()) in ('teacher', 'principal')
        and public.get_school_id() = school_id
        and exists (
            select 1 from public.classes c
            where c.id = folders.class_id
            and (c.teacher_id = public.get_profile_id() or (select public.get_my_role()) = 'principal')
        )
    )
    with check (
        (select public.get_my_role()) in ('teacher', 'principal')
        and public.get_school_id() = school_id
        and exists (
            select 1 from public.classes c
            where c.id = folders.class_id
            and (c.teacher_id = public.get_profile_id() or (select public.get_my_role()) = 'principal')
        )
    );

create policy "View class folders"
    on public.folders for select
    to authenticated
    using (
        public.get_school_id() = school_id
        and (
            (select public.get_my_role()) in ('teacher', 'principal')
            or exists (
                select 1 from public.enrollments e
                where e.class_id = folders.class_id
                and (e.student_id = public.get_profile_id() or e.parent_id = public.get_profile_id())
            )
        )
    );

-- 4. RLS POLICIES FOR RESOURCES
alter table public.resources enable row level security;

create policy "Teachers manage resources"
    on public.resources for all
    to authenticated
    using (
        exists (
            select 1 from public.folders f
            join public.classes c on c.id = f.class_id
            where f.id = resources.folder_id
            and f.school_id = public.get_school_id()
            and (c.teacher_id = public.get_profile_id() or (select public.get_my_role()) = 'principal')
        )
    )
    with check (
        exists (
            select 1 from public.folders f
            join public.classes c on c.id = f.class_id
            where f.id = resources.folder_id
            and f.school_id = public.get_school_id()
            and (c.teacher_id = public.get_profile_id() or (select public.get_my_role()) = 'principal')
        )
    );

create policy "View class resources"
    on public.resources for select
    to authenticated
    using (
        exists (
            select 1 from public.folders f
            where f.id = resources.folder_id
            and f.school_id = public.get_school_id()
            and (
                (select public.get_my_role()) in ('teacher', 'principal')
                or exists (
                    select 1 from public.enrollments e
                    where e.class_id = f.class_id
                    and (e.student_id = public.get_profile_id() or e.parent_id = public.get_profile_id())
                )
            )
        )
    );

-- 5. STORAGE BUCKET CONFIGURATION
insert into storage.buckets (id, name, public, file_size_limit)
values ('class_resources', 'class_resources', false, 10485760)
on conflict (id) do update set file_size_limit = 10485760;

-- 6. RLS POLICIES FOR STORAGE OBJECTS
create or replace function public.is_class_teacher_or_principal(c_id text)
returns boolean
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
    v_class_id bigint;
begin
    v_class_id := c_id::bigint;
    return exists (
        select 1 from public.classes c
        where c.id = v_class_id
        and (c.teacher_id = public.get_profile_id() or public.get_my_role() = 'principal')
    );
exception when others then
    return false;
end;
$$;

create or replace function public.is_enrolled_in_class(c_id text)
returns boolean
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
    v_class_id bigint;
begin
    v_class_id := c_id::bigint;
    return exists (
        select 1 from public.enrollments e
        where e.class_id = v_class_id
        and (e.student_id = public.get_profile_id() or e.parent_id = public.get_profile_id())
    );
exception when others then
    return false;
end;
$$;

create policy "Teachers can upload and delete class resources"
    on storage.objects for all
    to authenticated
    using (
        bucket_id = 'class_resources'
        and public.is_class_teacher_or_principal(split_part(name, '/', 1))
    )
    with check (
        bucket_id = 'class_resources'
        and public.is_class_teacher_or_principal(split_part(name, '/', 1))
    );

create policy "Enrolled students and parents can view class resources"
    on storage.objects for select
    to authenticated
    using (
        bucket_id = 'class_resources'
        and (
            public.is_class_teacher_or_principal(split_part(name, '/', 1))
            or public.is_enrolled_in_class(split_part(name, '/', 1))
        )
    );



-- ============================================================================
-- PART 3: COMMUNICATION HUB (from 00003_communication_hub.sql)
-- Adds file attachment support to messages
-- ============================================================================

ALTER TABLE messages
    ADD COLUMN IF NOT EXISTS attachment_url  text,
    ADD COLUMN IF NOT EXISTS attachment_type text CHECK (attachment_type IN ('image', 'document', 'video', 'audio'));

CREATE INDEX IF NOT EXISTS messages_attachment_type_idx ON messages (attachment_type) WHERE attachment_type IS NOT NULL;



-- ============================================================================
-- PART 4: SEED DATA (from seed.sql)
-- 2 schools, 26 users (password: Demo@123), classes, enrollments, attendance, announcements
-- ============================================================================

insert into schools (id, name, slug, address, phone, timezone, academic_year) overriding system value values
  (1, 'Sunrise Elementary', 'sunrise-elementary', '123 Learning Lane, Springfield', '+1-555-0101', 'America/New_York', '2025-2026'),
  (2, 'Oakridge High School', 'oakridge-high', '456 Knowledge Blvd, Westfield', '+1-555-0202', 'America/Chicago', '2025-2026');

select setval('schools_id_seq', 2);

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at, email_change_token_new, email_change, email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, phone, phone_confirmed_at, phone_change, phone_change_token, phone_change_sent_at, email_change_token_current, email_change_confirm_status, banned_until, reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at, is_anonymous)
select
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(), 'authenticated', 'authenticated',
  vals.email,
  crypt('Demo@123', gen_salt('bf')),
  now(), now(), '', now(), '', now(), '', '', now(), now(),
  '{"provider":"email","providers":["email"]}',
  jsonb_build_object('full_name', vals.full_name, 'role', vals.role, 'school_id', vals.school_id),
  false, now(), now(), null, null, '', '', now(), '', 0, null, '', now(), false, null, false
from (values
  ('sarah@sunrise.edu', 'Sarah Mitchell', 'principal', 1),
  ('james@oakridge.edu', 'James Thompson', 'principal', 2),
  ('emily@sunrise.edu', 'Emily Chen', 'teacher', 1),
  ('marcus@sunrise.edu', 'Marcus Johnson', 'teacher', 1),
  ('linda@oakridge.edu', 'Linda Patel', 'teacher', 2),
  ('robert@oakridge.edu', 'Robert Kim', 'teacher', 2),
  ('alice.parent@sunrise.edu', 'Alice Williams', 'parent', 1),
  ('bob.parent@sunrise.edu', 'Bob Davis', 'parent', 1),
  ('carol.parent@sunrise.edu', 'Carol Martinez', 'parent', 1),
  ('david.parent@sunrise.edu', 'David Brown', 'parent', 1),
  ('emma.parent@sunrise.edu', 'Emma Wilson', 'parent', 1),
  ('frank.parent@oakridge.edu', 'Frank Garcia', 'parent', 2),
  ('grace.parent@oakridge.edu', 'Grace Lee', 'parent', 2),
  ('henry.parent@oakridge.edu', 'Henry Taylor', 'parent', 2),
  ('iris.parent@oakridge.edu', 'Iris Anderson', 'parent', 2),
  ('jack.parent@oakridge.edu', 'Jack Thomas', 'parent', 2),
  ('student1@sunrise.edu', 'Liam Williams', 'student', 1),
  ('student2@sunrise.edu', 'Sophia Davis', 'student', 1),
  ('student3@sunrise.edu', 'Noah Martinez', 'student', 1),
  ('student4@sunrise.edu', 'Olivia Brown', 'student', 1),
  ('student5@sunrise.edu', 'Ethan Wilson', 'student', 1),
  ('student6@oakridge.edu', 'Ava Garcia', 'student', 2),
  ('student7@oakridge.edu', 'Mason Lee', 'student', 2),
  ('student8@oakridge.edu', 'Isabella Taylor', 'student', 2),
  ('student9@oakridge.edu', 'Lucas Anderson', 'student', 2),
  ('student10@oakridge.edu', 'Mia Thomas', 'student', 2)
) as vals(email, full_name, role, school_id);

insert into classes (id, school_id, name, grade, section, teacher_id, academic_year) overriding system value values
  (1, 1, 'Math 101', '3rd Grade', 'A', (select id from profiles where email = 'emily@sunrise.edu'), '2025-2026'),
  (2, 1, 'Science 101', '4th Grade', 'B', (select id from profiles where email = 'marcus@sunrise.edu'), '2025-2026'),
  (3, 2, 'Algebra I', '9th Grade', 'A', (select id from profiles where email = 'linda@oakridge.edu'), '2025-2026'),
  (4, 2, 'Biology', '10th Grade', 'B', (select id from profiles where email = 'robert@oakridge.edu'), '2025-2026');

select setval('classes_id_seq', 4);

insert into enrollments (class_id, student_id, parent_id) values
  (1, (select id from profiles where email = 'student1@sunrise.edu'), (select id from profiles where email = 'alice.parent@sunrise.edu')),
  (1, (select id from profiles where email = 'student2@sunrise.edu'), (select id from profiles where email = 'bob.parent@sunrise.edu')),
  (1, (select id from profiles where email = 'student3@sunrise.edu'), (select id from profiles where email = 'carol.parent@sunrise.edu')),
  (2, (select id from profiles where email = 'student4@sunrise.edu'), (select id from profiles where email = 'david.parent@sunrise.edu')),
  (2, (select id from profiles where email = 'student5@sunrise.edu'), (select id from profiles where email = 'emma.parent@sunrise.edu')),
  (3, (select id from profiles where email = 'student6@oakridge.edu'), (select id from profiles where email = 'frank.parent@oakridge.edu')),
  (3, (select id from profiles where email = 'student7@oakridge.edu'), (select id from profiles where email = 'grace.parent@oakridge.edu')),
  (3, (select id from profiles where email = 'student8@oakridge.edu'), (select id from profiles where email = 'henry.parent@oakridge.edu')),
  (4, (select id from profiles where email = 'student9@oakridge.edu'), (select id from profiles where email = 'iris.parent@oakridge.edu')),
  (4, (select id from profiles where email = 'student10@oakridge.edu'), (select id from profiles where email = 'jack.parent@oakridge.edu'));

insert into attendance_records (class_id, student_id, date, status, marked_by) values
  (1, (select id from profiles where email = 'student1@sunrise.edu'), current_date - 1, 'present', (select id from profiles where email = 'emily@sunrise.edu')),
  (1, (select id from profiles where email = 'student2@sunrise.edu'), current_date - 1, 'present', (select id from profiles where email = 'emily@sunrise.edu')),
  (1, (select id from profiles where email = 'student3@sunrise.edu'), current_date - 1, 'absent', (select id from profiles where email = 'emily@sunrise.edu')),
  (1, (select id from profiles where email = 'student1@sunrise.edu'), current_date - 2, 'present', (select id from profiles where email = 'emily@sunrise.edu')),
  (1, (select id from profiles where email = 'student2@sunrise.edu'), current_date - 2, 'late', (select id from profiles where email = 'emily@sunrise.edu')),
  (1, (select id from profiles where email = 'student3@sunrise.edu'), current_date - 2, 'present', (select id from profiles where email = 'emily@sunrise.edu')),
  (3, (select id from profiles where email = 'student6@oakridge.edu'), current_date - 1, 'present', (select id from profiles where email = 'linda@oakridge.edu')),
  (3, (select id from profiles where email = 'student7@oakridge.edu'), current_date - 1, 'absent', (select id from profiles where email = 'linda@oakridge.edu')),
  (3, (select id from profiles where email = 'student8@oakridge.edu'), current_date - 1, 'present', (select id from profiles where email = 'linda@oakridge.edu'));

insert into announcements (id, school_id, author_id, title, body, priority, target_roles) overriding system value values
  (1, 1, (select id from profiles where email = 'sarah@sunrise.edu'), 'Winter Break Reminder', 'School will be closed Dec 23 - Jan 3. Enjoy the holidays!', 'normal', '{all}'),
  (2, 1, (select id from profiles where email = 'sarah@sunrise.edu'), 'Early Dismissal Friday', 'School will close at 1:00 PM this Friday for staff development.', 'high', '{all}'),
  (3, 2, (select id from profiles where email = 'james@oakridge.edu'), 'Snow Day - School Closed', 'Due to severe weather, Oakridge High is closed today. Stay safe!', 'emergency', '{all}'),
  (4, 2, (select id from profiles where email = 'james@oakridge.edu'), 'Parent-Teacher Conference', 'Conferences scheduled for next Thursday. Sign-up link incoming.', 'normal', '{parent,teacher}');

select setval('announcements_id_seq', 4);

-- ============================================================================
-- DONE! All tables, RLS, seed data created.
-- Visit https://school-connect-teal.vercel.app and sign in:
--   Principal: sarah@sunrise.edu / Demo@123
--   Teacher:   emily@sunrise.edu  / Demo@123
--   Parent:    alice.parent@sunrise.edu / Demo@123
--   Student:   student1@sunrise.edu / Demo@123
-- ============================================================================
