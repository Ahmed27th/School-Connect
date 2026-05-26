-- ============================================================================
-- TEACHER DRIVE MIGRATION
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

-- Teachers can manage their class folders
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

-- Students and Parents can view folders for their enrolled classes
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
