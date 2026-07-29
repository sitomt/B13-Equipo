-- Dirección: un único super admin, sin etiqueta visible en la interfaz.
alter table public.employees
  add column if not exists is_super_admin boolean not null default false;

alter table public.employees
  drop constraint if exists employees_super_admin_requires_admin;

alter table public.employees
  add constraint employees_super_admin_requires_admin
  check (not is_super_admin or role = 'admin');

-- Como el modelo actual requiere un único perfil de dirección con este nivel,
-- la base de datos evita que se creen dos super admins por accidente.
create unique index if not exists employees_single_super_admin
  on public.employees ((is_super_admin))
  where is_super_admin;

-- El único super admin inicial no ficha. Los demás admins parten con el
-- fichaje activo y Ginés podrá cambiarlo desde Gestión del club.
update public.employees
set requires_time_tracking = true
where role = 'admin';

update public.employees
set is_super_admin = true,
    requires_time_tracking = false
where role = 'admin'
  and name = 'Ginés Munuera';
