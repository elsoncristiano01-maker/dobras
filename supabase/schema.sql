-- Execute no SQL Editor do Supabase (uma vez).
-- Cada linha pertence a um usuário; a RLS impede que um profissional veja dados de outro.

create table if not exists public.patients (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null,
  deleted boolean not null default false,
  synced_at timestamptz not null default now()
);

create table if not exists public.assessments (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null,
  deleted boolean not null default false,
  synced_at timestamptz not null default now()
);

create index if not exists patients_user_synced on public.patients (user_id, synced_at);
create index if not exists assessments_user_synced on public.assessments (user_id, synced_at);

-- synced_at é definido pelo servidor a cada escrita (evita problemas de relógio entre aparelhos)
create or replace function public.set_synced_at() returns trigger as $$
begin
  new.synced_at = now();
  return new;
end $$ language plpgsql;

drop trigger if exists patients_synced on public.patients;
create trigger patients_synced before insert or update on public.patients
  for each row execute function public.set_synced_at();
drop trigger if exists assessments_synced on public.assessments;
create trigger assessments_synced before insert or update on public.assessments
  for each row execute function public.set_synced_at();

alter table public.patients enable row level security;
alter table public.assessments enable row level security;

drop policy if exists "own patients" on public.patients;
create policy "own patients" on public.patients
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own assessments" on public.assessments;
create policy "own assessments" on public.assessments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
