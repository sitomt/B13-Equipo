-- El fichaje es obligatorio por defecto. Dirección puede desactivarlo por perfil.
alter table public.employees
  add column if not exists requires_time_tracking boolean not null default true;

-- Dirección no registra jornada en la app.
update public.employees
set requires_time_tracking = false
where name in ('Ginés Munuera', 'José Noguera');
