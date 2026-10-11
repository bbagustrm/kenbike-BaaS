-- #34 — RLS & grants untuk anon, customer, dan admin.

-- Fixture: customer A, customer B, admin
insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local', 'authenticated', 'authenticated', '{"full_name":"Customer A"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.local', 'authenticated', 'authenticated', '{"name":"Customer B","picture":"https://x/b.png"}'),
  ('00000000-0000-0000-0000-0000000000ad', 'admin@test.local', 'authenticated', 'authenticated', '{}');

update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000ad';

insert into public.addresses (profile_id, recipient_name, phone, address_line, city, province, postal_code)
values ('00000000-0000-0000-0000-00000000000b', 'B', '08123456789', 'Jl. Rahasia No. 2', 'Bandung', 'Jawa Barat', '40111');

select pg_temp.eq('signup: profile diisi dari metadata Google (name)',
  (select full_name from public.profiles where id = '00000000-0000-0000-0000-00000000000b'), 'Customer B');
select pg_temp.eq('signup: avatar diisi dari metadata Google (picture)',
  (select avatar_url from public.profiles where id = '00000000-0000-0000-0000-00000000000b'), 'https://x/b.png');
select pg_temp.eq('signup: cart dibuat otomatis',
  (select count(*) from public.carts where profile_id = '00000000-0000-0000-0000-00000000000a'), 1::bigint);
select pg_temp.eq('signup: role default customer',
  (select role::text from public.profiles where id = '00000000-0000-0000-0000-00000000000a'), 'customer');

-- ------------------------------------------------------------
-- anon
-- ------------------------------------------------------------
select pg_temp.login(null);
set local role anon;

select pg_temp.check('anon: bisa membaca produk aktif', (select count(*) from public.products) > 0);
select pg_temp.eq('anon: produk nonaktif tidak terlihat',
  (select count(*) from public.products where not is_active), 0::bigint);
select pg_temp.lives('anon: bisa membaca kolom publik varian', 'select id, sku, price from public.product_variants limit 1');
select pg_temp.throws('anon: TIDAK bisa membaca stok fisik', 'select quantity from public.product_variants', '42501');
select pg_temp.throws('anon: tidak punya akses orders', 'select id from public.orders', '42501');
select pg_temp.throws('anon: tidak punya akses profiles', 'select id from public.profiles', '42501');
select pg_temp.throws('anon: tidak punya akses carts', 'select id from public.carts', '42501');
select pg_temp.throws('anon: tidak bisa menulis katalog',
  $$ insert into public.categories (name, slug) values ('X', 'x') $$, '42501');
select pg_temp.lives('anon: bisa memanggil get_variant_availability',
  'select * from public.get_variant_availability(array(select id from public.product_variants limit 3))');
select pg_temp.throws('anon: tidak bisa memanggil get_or_create_cart', 'select public.get_or_create_cart()', '42501');
select pg_temp.throws('anon: tidak bisa memanggil is_admin lewat public', 'select public.is_admin()', '42883');
reset role;

-- ------------------------------------------------------------
-- customer A
-- ------------------------------------------------------------
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
set local role authenticated;

select pg_temp.eq('customer: hanya melihat profile sendiri', (select count(*) from public.profiles), 1::bigint);
select pg_temp.lives('customer: bisa mengubah nama sendiri',
  $$ update public.profiles set full_name = 'Nama Baru' where id = '00000000-0000-0000-0000-00000000000a' $$);
select pg_temp.throws('customer: TIDAK bisa mengubah role sendiri',
  $$ update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-00000000000a' $$, '42501');
select pg_temp.eq('customer: tidak melihat alamat customer lain', (select count(*) from public.addresses), 0::bigint);
select pg_temp.lives('customer: bisa menambah alamat sendiri',
  $$ insert into public.addresses (profile_id, recipient_name, phone, address_line, city, province, postal_code)
     values ('00000000-0000-0000-0000-00000000000a', 'A', '08123456780', 'Jl. Sendiri No. 1', 'Semarang', 'Jawa Tengah', '50111') $$);
select pg_temp.throws('customer: tidak bisa menambah alamat atas nama orang lain',
  $$ insert into public.addresses (profile_id, recipient_name, phone, address_line, city, province, postal_code)
     values ('00000000-0000-0000-0000-00000000000b', 'A', '08123456780', 'Jl. Orang Lain', 'Semarang', 'Jawa Tengah', '50111') $$,
  '42501');
select pg_temp.throws('customer: tidak bisa insert order langsung',
  $$ insert into public.orders (profile_id, subtotal, total_amount, courier_code, courier_service, shipping_address_snapshot, expires_at)
     values ('00000000-0000-0000-0000-00000000000a', 0, 0, 'jne', 'reg', '{}', now()) $$, '42501');
select pg_temp.throws('customer: tidak bisa memanggil create_order (service role saja)',
  $$ select public.create_order('00000000-0000-0000-0000-00000000000a', gen_random_uuid(), 'jne', 'reg', 0) $$, '42501');
select pg_temp.throws('customer: tidak bisa memanggil confirm_payment',
  'select public.confirm_payment(gen_random_uuid())', '42501');
select pg_temp.throws('customer: tidak bisa memanggil expire_pending_orders',
  'select public.expire_pending_orders()', '42501');
select pg_temp.throws('customer: tidak bisa membaca payments.raw_response', 'select raw_response from public.payments', '42501');
select pg_temp.lives('customer: bisa membaca kolom publik payments', 'select id, status, snap_token from public.payments');
select pg_temp.throws('customer: tidak bisa membaca order_status_history.raw_payload',
  'select raw_payload from public.order_status_history', '42501');
select pg_temp.eq('customer: tidak melihat stock_adjustments (seed punya data)',
  (select count(*) from public.stock_adjustments), 0::bigint);
select pg_temp.throws('customer: tidak bisa menulis catatan internal',
  $$ insert into public.order_internal_notes (order_id, admin_id, note)
     values (gen_random_uuid(), '00000000-0000-0000-0000-00000000000a', 'x') $$, '42501');
select pg_temp.eq('customer: tidak melihat reservasi stok', (select count(*) from public.stock_reservations), 0::bigint);
select pg_temp.throws('customer: tidak bisa memanggil RPC admin',
  $$ select public.admin_set_role('00000000-0000-0000-0000-00000000000a', 'admin') $$, '42501', 'forbidden');
select pg_temp.throws('customer: tidak bisa memanggil admin_get_stock',
  'select * from public.admin_get_stock(array[]::uuid[])', '42501', 'forbidden');
with u as (update public.categories set name = 'Hack' returning 1)
select pg_temp.eq('customer: update katalog → 0 baris (RLS)', (select count(*) from u), 0::bigint);
reset role;

-- ------------------------------------------------------------
-- admin
-- ------------------------------------------------------------
select pg_temp.login('00000000-0000-0000-0000-0000000000ad');
set local role authenticated;

select pg_temp.check('admin: melihat semua profile', (select count(*) from public.profiles) >= 3);
select pg_temp.eq('admin: bisa membaca semua alamat', (select count(*) from public.addresses), 2::bigint);
select pg_temp.lives('admin: bisa menulis katalog',
  $$ insert into public.categories (name, slug) values ('Uji', 'uji-kategori') $$);
select pg_temp.throws('admin: stok fisik tetap tidak terbaca lewat tabel',
  'select quantity from public.product_variants', '42501');
select pg_temp.check('admin: melihat stock_adjustments', (select count(*) from public.stock_adjustments) > 0);
select pg_temp.lives('admin: bisa memanggil admin_get_stock',
  'select * from public.admin_get_stock(array(select id from public.product_variants limit 3))');
with u as (
  update public.addresses set city = 'X'
  where profile_id = '00000000-0000-0000-0000-00000000000b' returning 1
)
select pg_temp.eq('admin: tidak bisa mengubah alamat customer (0 baris)', (select count(*) from u), 0::bigint);
reset role;
