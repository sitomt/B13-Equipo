-- Separa el calendario informativo de los cambios de horario diarios.
alter table public.calendar_events
  add column if not exists entry_type text not null default 'schedule',
  add column if not exists event_time time;

update public.calendar_events
set entry_type = 'event'
where kind = 'festivo';

-- Conserva los registros históricos duplicados como eventos informativos y
-- deja una única excepción de horario por día.
with ranked_schedule_entries as (
  select
    id,
    row_number() over (
      partition by event_date
      order by created_at, id
    ) as position
  from public.calendar_events
  where entry_type = 'schedule'
)
update public.calendar_events as event
set
  entry_type = 'event',
  kind = 'festivo',
  open_time = null,
  close_time = null
from ranked_schedule_entries as ranked
where event.id = ranked.id
  and ranked.position > 1;

alter table public.calendar_events
  drop constraint if exists calendar_events_entry_type_check;

alter table public.calendar_events
  add constraint calendar_events_entry_type_check
  check (entry_type in ('event', 'schedule'));

create unique index if not exists calendar_events_one_schedule_per_day_idx
  on public.calendar_events (event_date)
  where entry_type = 'schedule';

-- Periodos de horario habitual. Un periodo con fecha final prevalece sobre los
-- horarios indefinidos durante sus fechas y, al terminar, estos se reanudan.
create table if not exists public.club_schedules (
  id uuid primary key default gen_random_uuid(),
  start_date date not null,
  end_date date,
  weekday_open time,
  weekday_close time,
  weekday_closed boolean not null default false,
  saturday_open time,
  saturday_close time,
  saturday_closed boolean not null default false,
  sunday_open time,
  sunday_close time,
  sunday_closed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint club_schedules_dates_check
    check (end_date is null or end_date >= start_date),
  constraint club_schedules_weekday_hours_check
    check (weekday_closed or (
      weekday_open is not null and weekday_close is not null and weekday_close > weekday_open
    )),
  constraint club_schedules_saturday_hours_check
    check (saturday_closed or (
      saturday_open is not null and saturday_close is not null and saturday_close > saturday_open
    )),
  constraint club_schedules_sunday_hours_check
    check (sunday_closed or (
      sunday_open is not null and sunday_close is not null and sunday_close > sunday_open
    ))
);

create index if not exists club_schedules_dates_idx
  on public.club_schedules (start_date, end_date);

alter table public.club_schedules enable row level security;

grant select, insert, update, delete on table public.club_schedules to anon, authenticated;

drop policy if exists "club schedules are readable" on public.club_schedules;
create policy "club schedules are readable"
  on public.club_schedules
  for select
  to anon, authenticated
  using (true);

-- La app piloto identifica el rol en su propia sesión, no mediante Supabase
-- Auth. Esta política mantiene el mismo modelo de acceso que calendar_events;
-- la interfaz solo muestra la edición a perfiles admin.
drop policy if exists "club schedules are editable" on public.club_schedules;
create policy "club schedules are editable"
  on public.club_schedules
  for all
  to anon, authenticated
  using (true)
  with check (true);

insert into public.club_schedules (
  start_date,
  weekday_open,
  weekday_close,
  saturday_open,
  saturday_close,
  sunday_open,
  sunday_close,
  sunday_closed
)
select
  '2026-01-01',
  '06:00',
  '23:00',
  '09:00',
  '20:00',
  '09:00',
  '14:00',
  false
where not exists (select 1 from public.club_schedules);

insert into public.club_schedules (
  start_date,
  weekday_open,
  weekday_close,
  saturday_open,
  saturday_close,
  sunday_open,
  sunday_close,
  sunday_closed
)
select
  '2026-07-01',
  '07:00',
  '22:00',
  '09:00',
  '18:00',
  '09:00',
  '14:00',
  true
where not exists (
  select 1
  from public.club_schedules
  where start_date = '2026-07-01'
);
