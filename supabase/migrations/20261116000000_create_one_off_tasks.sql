create table if not exists public.one_off_task_completions (
  resource_id uuid primary key references public.resources(id) on delete cascade,
  completed_by uuid not null references public.participants(id) on delete cascade,
  completed_at timestamptz not null default now()
);

grant select, insert on public.one_off_task_completions to authenticated;

alter table public.one_off_task_completions enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'one_off_task_completions'
      and policyname = 'Group members can view completed one-off tasks'
  ) then
    create policy "Group members can view completed one-off tasks"
      on public.one_off_task_completions for select
      using (
        exists (
          select 1
          from public.resources r
          join public.group_members gm on gm.group_id = r.group_id
          join public.participants p on p.id = gm.participant_id
          where r.id = one_off_task_completions.resource_id
            and p.user_id = (select auth.uid())
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'one_off_task_completions'
      and policyname = 'Group members can complete one-off tasks'
  ) then
    create policy "Group members can complete one-off tasks"
      on public.one_off_task_completions for insert
      with check (
        exists (
          select 1
          from public.resources r
          join public.group_members gm on gm.group_id = r.group_id
          join public.participants p on p.id = gm.participant_id
          where r.id = one_off_task_completions.resource_id
            and r.sharing_method = 'One-off'
            and gm.participant_id = one_off_task_completions.completed_by
            and p.user_id = (select auth.uid())
        )
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'one_off_task_completions'
  ) then
    alter publication supabase_realtime add table public.one_off_task_completions;
  end if;
end
$$;
