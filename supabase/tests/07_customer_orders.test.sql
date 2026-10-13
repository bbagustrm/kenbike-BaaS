-- #68/#69 — Customer hanya melihat order, riwayat, dan pengiriman miliknya sendiri.

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-0000000000e1', 'e1@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000e2', 'e2@test.local', 'authenticated', 'authenticated');

insert into public.addresses (id, profile_id, recipient_name, phone, address_line, city, province, postal_code, biteship_area_id)
values ('00000000-0000-0000-0000-0000000000e9', '00000000-0000-0000-0000-0000000000e1',
        'E1', '08123456780', 'Jl. E No. 1', 'Semarang', 'Jawa Tengah', '50111', 'AREA-E');

insert into public.cart_items (cart_id, variant_id, quantity)
select c.id, (select id from public.product_variants where sku = 'KB-PSS-50'), 1
from public.carts c where c.profile_id = '00000000-0000-0000-0000-0000000000e1';

create temp table _o (id uuid, order_number text) on commit drop;
grant all on _o to public;

set local role service_role;
insert into _o
select o.id, o.order_number
from public.create_order('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000e9',
                         'jne', 'reg', 25000) as o;
insert into public.shipments (order_id, waybill_id, tracking_url, origin_address_snapshot, destination_address_snapshot)
select id, 'WYB-1', 'https://track.biteship.com/x', '{}', '{}' from _o;
reset role;

-- Pemilik
select pg_temp.login('00000000-0000-0000-0000-0000000000e1');
set local role authenticated;
select pg_temp.eq('pemilik melihat ordernya', (select count(*) from public.orders), 1::bigint);
select pg_temp.check('pemilik membaca riwayat status ordernya',
  (select count(*) from public.order_status_history) >= 1);
select pg_temp.eq('pemilik membaca link pelacakan',
  (select tracking_url from public.shipments), 'https://track.biteship.com/x');
select pg_temp.throws('payload mentah riwayat tidak terbuka untuk customer',
  'select raw_payload from public.order_status_history', '42501');
select pg_temp.throws('customer tidak bisa mengubah link pelacakan',
  $$ update public.shipments set tracking_url = 'https://evil.example' $$, '42501');
reset role;

-- Customer lain
select pg_temp.login('00000000-0000-0000-0000-0000000000e2');
set local role authenticated;
select pg_temp.eq('customer lain tidak melihat order', (select count(*) from public.orders), 0::bigint);
select pg_temp.eq('customer lain tidak melihat riwayat',
  (select count(*) from public.order_status_history), 0::bigint);
select pg_temp.eq('customer lain tidak melihat pengiriman', (select count(*) from public.shipments), 0::bigint);
select pg_temp.eq('customer lain tidak melihat item order', (select count(*) from public.order_items), 0::bigint);
reset role;
