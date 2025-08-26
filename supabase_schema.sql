-- Enable required extension for gen_random_uuid()
create extension if not exists pgcrypto;

-- Tables for grape sticker app

create table if not exists public.grape_bunches (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  total_berries int not null check (total_berries between 1 and 200),
  filled_berries int not null default 0 check (filled_berries >= 0),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_grape_bunches_device_active on public.grape_bunches (device_id) where completed_at is null;
create index if not exists idx_grape_bunches_device_completed on public.grape_bunches (device_id, completed_at desc);

create table if not exists public.grape_clicks (
  id uuid primary key default gen_random_uuid(),
  bunch_id uuid not null references public.grape_bunches(id) on delete cascade,
  position int not null check (position > 0),
  clicked_at timestamptz not null default now()
);

-- Add optional note column for recording what the user did well
alter table public.grape_clicks
  add column if not exists note text;

create index if not exists idx_grape_clicks_bunch on public.grape_clicks (bunch_id);

-- RLS (optional here since anonymous use). Keep open for simplicity.
alter table public.grape_bunches enable row level security;
alter table public.grape_clicks enable row level security;

-- Policies: allow anonymous read/write to needed columns
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'grape_bunches' and policyname = 'bunches_select_all'
  ) then
    create policy bunches_select_all on public.grape_bunches for select using (true);
  end if;
  if not exists (
    select 1 from pg_policies where tablename = 'grape_bunches' and policyname = 'bunches_insert'
  ) then
    create policy bunches_insert on public.grape_bunches for insert with check (true);
  end if;
  if not exists (
    select 1 from pg_policies where tablename = 'grape_bunches' and policyname = 'bunches_update'
  ) then
    create policy bunches_update on public.grape_bunches for update using (true) with check (true);
  end if;
end $$;

-- Reload PostgREST schema cache after changes
notify pgrst, 'reload schema';

-- Ask PostgREST (API) to reload the schema cache so new tables are visible
notify pgrst, 'reload schema';

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'grape_clicks' and policyname = 'clicks_select_all'
  ) then
    create policy clicks_select_all on public.grape_clicks for select using (true);
  end if;
  if not exists (
    select 1 from pg_policies where tablename = 'grape_clicks' and policyname = 'clicks_insert'
  ) then
    create policy clicks_insert on public.grape_clicks for insert with check (true);
  end if;
  if not exists (
    select 1 from pg_policies where tablename = 'grape_clicks' and policyname = 'clicks_delete'
  ) then
    create policy clicks_delete on public.grape_clicks for delete using (true);
  end if;
end $$;


