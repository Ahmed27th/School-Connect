-- ============================================================================
-- GRADING & ASSIGNMENT SYSTEM
-- Tables, RLS, and storage for assignments and student submissions
-- ============================================================================

-- 1. ASSIGNMENTS TABLE
create table public.assignments (
    id          bigint generated always as identity primary key,
    class_id    bigint not null references public.classes(id) on delete cascade,
    title       text not null,
    description text,
    due_date    timestamptz,
    total_points numeric(6,2) not null default 100,
    created_by  bigint not null references public.profiles(id),
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

create index assignments_class_id_idx on public.assignments (class_id);
create index assignments_due_date_idx on public.assignments (due_date);
create index assignments_created_by_idx on public.assignments (created_by);

-- 2. SUBMISSIONS TABLE
create table public.submissions (
    id            bigint generated always as identity primary key,
    assignment_id bigint not null references public.assignments(id) on delete cascade,
    student_id    bigint not null references public.profiles(id) on delete cascade,
    file_url      text,
    grade         numeric(6,2),
    feedback      text,
    submitted_at  timestamptz not null default now(),
    unique(assignment_id, student_id)
);

create index submissions_assignment_id_idx on public.submissions (assignment_id);
create index submissions_student_id_idx on public.submissions (student_id);

-- ============================================================================
-- RLS: ASSIGNMENTS
-- ============================================================================
alter table public.assignments enable row level security;

-- Teachers/Principals can manage assignments for their classes
create policy "Teachers manage their class assignments"
    on public.assignments for all
    to authenticated
    using (
        (select public.get_my_role()) in ('teacher', 'principal')
        and public.get_school_id() = (select c.school_id from public.classes c where c.id = class_id)
        and exists (
            select 1 from public.classes c
            where c.id = assignments.class_id
            and (c.teacher_id = public.get_profile_id() or (select public.get_my_role()) = 'principal')
        )
    )
    with check (
        (select public.get_my_role()) in ('teacher', 'principal')
        and public.get_school_id() = (select c.school_id from public.classes c where c.id = class_id)
        and exists (
            select 1 from public.classes c
            where c.id = assignments.class_id
            and (c.teacher_id = public.get_profile_id() or (select public.get_my_role()) = 'principal')
        )
    );

-- Students and Parents can view assignments for classes they are enrolled in
create policy "View assignments - enrolled participants"
    on public.assignments for select
    to authenticated
    using (
        public.get_school_id() = (select c.school_id from public.classes c where c.id = class_id)
        and (
            (select public.get_my_role()) in ('teacher', 'principal')
            or exists (
                select 1 from public.enrollments e
                where e.class_id = assignments.class_id
                and (e.student_id = public.get_profile_id() or e.parent_id = public.get_profile_id())
            )
        )
    );

-- ============================================================================
-- RLS: SUBMISSIONS
-- ============================================================================
alter table public.submissions enable row level security;

-- Teachers/Principals can view and grade submissions for their assignments
create policy "Teachers grade submissions"
    on public.submissions for all
    to authenticated
    using (
        (select public.get_my_role()) in ('teacher', 'principal')
        and exists (
            select 1 from public.assignments a
            join public.classes c on c.id = a.class_id
            where a.id = submissions.assignment_id
            and c.school_id = public.get_school_id()
            and (c.teacher_id = public.get_profile_id() or (select public.get_my_role()) = 'principal')
        )
    )
    with check (
        (select public.get_my_role()) in ('teacher', 'principal')
        and exists (
            select 1 from public.assignments a
            join public.classes c on c.id = a.class_id
            where a.id = submissions.assignment_id
            and c.school_id = public.get_school_id()
            and (c.teacher_id = public.get_profile_id() or (select public.get_my_role()) = 'principal')
        )
    );

-- Students can insert their own submissions
create policy "Students submit own work"
    on public.submissions for insert
    to authenticated
    with check (
        student_id = (select public.get_profile_id())
        and (select public.get_my_role()) = 'student'
        and exists (
            select 1 from public.assignments a
            join public.classes c on c.id = a.class_id
            join public.enrollments e on e.class_id = c.id
            where a.id = submissions.assignment_id
            and e.student_id = (select public.get_profile_id())
        )
    );

-- Students can view their own submissions
create policy "Students view own submissions"
    on public.submissions for select
    to authenticated
    using (
        student_id = (select public.get_profile_id())
        and (select public.get_my_role()) = 'student'
    );

-- Parents can view their children's submissions
create policy "Parents view children's submissions"
    on public.submissions for select
    to authenticated
    using (
        (select public.get_my_role()) = 'parent'
        and exists (
            select 1 from public.enrollments e
            where e.student_id = submissions.student_id
            and e.parent_id = (select public.get_profile_id())
        )
    );

-- ============================================================================
-- STORAGE: homework_submissions bucket
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit)
values ('homework_submissions', 'homework_submissions', false, 10485760)
on conflict (id) do update set file_size_limit = 10485760;

-- Helper: check if profile is enrolled as student in the class for this assignment
create or replace function public.is_student_in_assignment_class(assignment_id bigint)
returns boolean
language plpgsql
security definer
stable
set search_path = ''
as $$
begin
    return exists (
        select 1 from public.assignments a
        join public.enrollments e on e.class_id = a.class_id
        where a.id = assignment_id
        and e.student_id = public.get_profile_id()
    );
end;
$$;

-- Helper: check if profile is parent of a student in the class for this assignment
create or replace function public.is_parent_of_assignment_student(assignment_id bigint, student_id bigint)
returns boolean
language plpgsql
security definer
stable
set search_path = ''
as $$
begin
    return exists (
        select 1 from public.assignments a
        join public.enrollments e on e.class_id = a.class_id
        where a.id = assignment_id
        and e.student_id = student_id
        and e.parent_id = public.get_profile_id()
    );
end;
$$;

-- Helper: check if user is teacher/principal for the class this assignment belongs to
create or replace function public.is_assignment_class_teacher(assignment_id bigint)
returns boolean
language plpgsql
security definer
stable
set search_path = ''
as $$
begin
    return exists (
        select 1 from public.assignments a
        join public.classes c on c.id = a.class_id
        where a.id = assignment_id
        and c.school_id = public.get_school_id()
        and (c.teacher_id = public.get_profile_id() or public.get_my_role() = 'principal')
    );
end;
$$;

-- Students can upload their own homework
create policy "Students upload own homework"
    on storage.objects for insert
    to authenticated
    with check (
        bucket_id = 'homework_submissions'
        and public.is_student_in_assignment_class(
            split_part(name, '/', 1)::bigint
        )
    );

-- Students can read their own uploaded files
create policy "Students read own homework"
    on storage.objects for select
    to authenticated
    using (
        bucket_id = 'homework_submissions'
        and (
            -- Student who uploaded it
            (select public.get_my_role()) = 'student'
            and public.is_student_in_assignment_class(
                split_part(name, '/', 1)::bigint
            )
            or
            -- Teacher/principal of the class
            (select public.get_my_role()) in ('teacher', 'principal')
            and public.is_assignment_class_teacher(
                split_part(name, '/', 1)::bigint
            )
            or
            -- Parent of the student who submitted
            (select public.get_my_role()) = 'parent'
            and exists (
                select 1 from public.submissions s
                where s.file_url like '%' || name
                and public.is_parent_of_assignment_student(s.assignment_id, s.student_id)
            )
        )
    );

-- Teachers/Principals can delete homework files
create policy "Teachers delete homework files"
    on storage.objects for delete
    to authenticated
    using (
        bucket_id = 'homework_submissions'
        and public.is_assignment_class_teacher(
            split_part(name, '/', 1)::bigint
        )
    );

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
