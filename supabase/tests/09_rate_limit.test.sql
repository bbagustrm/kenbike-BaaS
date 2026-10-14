-- #75 — check_rate_limit: hanya service role, menghitung per kunci & jendela.

select pg_temp.login('00000000-0000-0000-0000-00000000000a');
set local role authenticated;
select pg_temp.throws('authenticated tidak bisa memanggil check_rate_limit',
  $$ select public.check_rate_limit('x', 1, 60) $$, '42501');
reset role;

set local role service_role;
select pg_temp.check('hit 1 dari 2: lolos', public.check_rate_limit('uji:a', 2, 3600));
select pg_temp.check('hit 2 dari 2: lolos', public.check_rate_limit('uji:a', 2, 3600));
select pg_temp.check('hit 3 dari 2: ditolak', not public.check_rate_limit('uji:a', 2, 3600));
select pg_temp.check('kunci lain tidak terpengaruh', public.check_rate_limit('uji:b', 2, 3600));
select pg_temp.throws('kunci kosong ditolak',
  $$ select public.check_rate_limit(null, 1, 60) $$, '22023');
reset role;
