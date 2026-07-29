-- Dirección (Ginés Munuera y José Noguera) no ficha: no tiene horario en la app.
-- La migración anterior reactivó el fichaje a todos los admins; aquí se mantiene
-- la excepción explícita para los perfiles de dirección.
update public.employees
set requires_time_tracking = false
where role = 'admin'
  and name in ('Ginés Munuera', 'José Noguera');
