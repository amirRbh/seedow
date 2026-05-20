
create table if not exists public.cron_run_log (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  status text not null check (status in ('ok', 'error', 'partial')),
  message text,
  assets_ok integer not null default 0,
  assets_failed integer not null default 0,
  duration_ms integer,
  details jsonb,
  ran_at timestamptz not null default now()
);

create index if not exists cron_run_log_job_ran_idx
  on public.cron_run_log (job_name, ran_at desc);

alter table public.cron_run_log enable row level security;

create policy "Cron logs readable by authenticated users"
  on public.cron_run_log
  for select
  to authenticated
  using (true);
