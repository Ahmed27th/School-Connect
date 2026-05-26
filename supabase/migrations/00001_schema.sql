-- ============================================================================
-- SCHOOL SAAS MVP - Multi-Tenant PostgreSQL Schema
-- Stack: Supabase (PostgreSQL) + Next.js
-- Principles: lowercase_snake_case, bigint IDENTITY PKs, indexed FKs,
--             RLS with security definer functions, least privilege
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
-- School management initially manual (no self-serve)

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

-- Teachers/Principals see all enrollments in their school
-- Parents see only their children's enrollments
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
-- Insert from server-side functions; RLS bypassed via service_role

-- ============================================================================
-- INDEXES FOR RLS PERFORMANCE
-- ============================================================================
-- (Additional indexes beyond FK indexes already created above)
-- RLS policies heavily filter on school_id and profile_id - these are indexed
-- The get_school_id() function hits profiles(school_id) via profiles(user_id)

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
        -- Find the parent for this student
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
-- Revoke public defaults
revoke all on schema public from public;

-- Grant usage to authenticated role
grant usage on schema public to authenticated;

-- Table permissions
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage on all sequences in schema public to authenticated;

-- Future tables
alter default privileges for role postgres in schema public
    grant select, insert, update, delete on tables to authenticated;

alter default privileges for role postgres in schema public
    grant usage on sequences to authenticated;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
