-- M9 — admin_list_users & admin_dashboard_stats.

insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000f1', 'pembeli.uji@test.local', 'authenticated', 'authenticated', '{"full_name":"Pembeli Uji"}'),
  ('00000000-0000-0000-0000-0000000000fa', 'admin.uji@test.local', 'authenticated', 'authenticated', '{}');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000fa';

insert into public.addresses (id, profile_id, recipient_name, phone, address_line, city, province, postal_code, biteship_area_id)
values ('00000000-0000-0000-0000-0000000000f9', '00000000-0000-0000-0000-0000000000f1',
        'F1', '08123456780', 'Jl. F No. 1', 'Semarang', 'Jawa Tengah', '50111', 'AREA-F');
insert into public.cart_items (cart_id, variant_id, quantity)
select c.id, (select id from public.product_variants where sku = 'KB-PSS-50'), 1
from public.carts c where c.profile_id = '00000000-0000-0000-0000-0000000000f1';

set local role service_role;
select public.confirm_payment((public.create_order(
  '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f9', 'jne', 'reg', 25000)).id);
reset role;

-- Customer: ditolak.
select pg_temp.login('00000000-0000-0000-0000-0000000000f1');
set local role authenticated;
select pg_temp.throws('customer tidak bisa memanggil admin_list_users',
  'select * from public.admin_list_users()', '42501');
select pg_temp.throws('customer tidak bisa memanggil admin_dashboard_stats',
  'select public.admin_dashboard_stats()', '42501');
reset role;

select pg_temp.login(null);
set local role anon;
select pg_temp.throws('anon tidak bisa memanggil admin_list_users',
  'select * from public.admin_list_users()', '42501');
reset role;

-- Admin.
select pg_temp.login('00000000-0000-0000-0000-0000000000fa');
set local role authenticated;
select pg_temp.eq('admin_list_users: cari email + jumlah order',
  (select order_count from public.admin_list_users('pembeli.uji')), 1::bigint);
select pg_temp.eq('admin_list_users: cari nama',
  (select email from public.admin_list_users('Pembeli Uji')), 'pembeli.uji@test.local');
select pg_temp.check('admin_list_users: filter role admin',
  (select bool_and(role = 'admin') from public.admin_list_users(null, 'admin')));
select pg_temp.eq('admin_list_users: total_count konsisten dengan limit',
  (select count(*) from public.admin_list_users(null, null, 1)), 1::bigint);

select pg_temp.check('dashboard: omzet mencakup order lunas hari ini',
  (public.admin_dashboard_stats(7) ->> 'revenue')::bigint >= 12900000 + 25000);
select pg_temp.eq('dashboard: 7 baris harian',
  jsonb_array_length(public.admin_dashboard_stats(7) -> 'daily'), 7);
select pg_temp.check('dashboard: tanggal harian berformat YYYY-MM-DD',
  (public.admin_dashboard_stats(7) -> 'daily' -> 0 ->> 'date') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$');
select pg_temp.check('dashboard: order lunas menunggu dikirim terhitung',
  (public.admin_dashboard_stats() ->> 'to_ship')::int >= 1);
reset role;
