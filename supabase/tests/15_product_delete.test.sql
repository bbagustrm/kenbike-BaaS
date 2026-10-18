-- Hapus produk permanen: hanya admin, ditolak bila ada pesanan berjalan,
-- riwayat pesanan selesai tetap utuh (variant_id dikosongkan).

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-0000000000e1', 'deladmin@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000e2', 'delbuyer@test.local', 'authenticated', 'authenticated');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000e1';

create temp table _ctx (key text primary key, id uuid) on commit drop;
grant all on _ctx to public;
create function pg_temp.ctx(p_key text) returns uuid language sql as $$ select id from _ctx where key = p_key $$;

create function pg_temp.payload(p_slug text) returns jsonb language sql as $$
  select jsonb_build_object(
    'category_id', (select id from public.categories where slug = 'aksesoris'),
    'name', 'Produk Hapus ' || p_slug,
    'slug', p_slug,
    'options', '[]'::jsonb,
    'variants', jsonb_build_array(jsonb_build_object(
      'sku', upper(p_slug), 'price', 50000, 'weight_gram', 100, 'initial_stock', 5,
      'length_cm', 10, 'width_cm', 10, 'height_cm', 10, 'options', '{}'::jsonb))
  )
$$;

select pg_temp.login('00000000-0000-0000-0000-0000000000e1');
set local role authenticated;
insert into _ctx select 'a', public.admin_create_product(pg_temp.payload('hapus-a'));
insert into _ctx select 'b', public.admin_create_product(pg_temp.payload('hapus-b'));
insert into _ctx select 'c', public.admin_create_product(pg_temp.payload('hapus-c'));
reset role;

insert into public.product_images (product_id, storage_path, sort_order) values
  (pg_temp.ctx('a'), 'products/a/1.jpg', 0),
  (pg_temp.ctx('a'), 'products/a/2.jpg', 1);

-- Pesanan selesai memakai produk A (foto 1 jadi snapshot), pesanan berjalan memakai produk B.
insert into public.orders (id, profile_id, subtotal, total_amount, courier_code, courier_service,
                           shipping_address_snapshot, expires_at, payment_status, shipping_status)
values
  ('00000000-0000-0000-0000-0000000000e5', '00000000-0000-0000-0000-0000000000e2', 50000, 50000,
   'jne', 'reg', '{}', now(), 'paid', 'delivered'),
  ('00000000-0000-0000-0000-0000000000e6', '00000000-0000-0000-0000-0000000000e2', 50000, 50000,
   'jne', 'reg', '{}', now(), 'paid', 'processing');
insert into public.order_items (order_id, variant_id, quantity, price_at_purchase, weight_gram_snapshot,
                                product_name_snapshot, image_url_snapshot)
select '00000000-0000-0000-0000-0000000000e5', id, 1, 50000, 100, 'Produk Hapus A', 'products/a/1.jpg'
from public.product_variants where sku = 'HAPUS-A';
insert into public.order_items (order_id, variant_id, quantity, price_at_purchase, weight_gram_snapshot,
                                product_name_snapshot)
select '00000000-0000-0000-0000-0000000000e6', id, 1, 50000, 100, 'Produk Hapus B'
from public.product_variants where sku = 'HAPUS-B';

-- Bukan admin
select pg_temp.login('00000000-0000-0000-0000-0000000000e2');
set local role authenticated;
select pg_temp.throws('pembeli tidak bisa menghapus produk',
  format($$ select public.admin_delete_products(array[%L]::uuid[]) $$, pg_temp.ctx('c')), '42501');
reset role;

select pg_temp.login('00000000-0000-0000-0000-0000000000e1');
set local role authenticated;
select pg_temp.throws('daftar kosong ditolak',
  $$ select public.admin_delete_products('{}'::uuid[]) $$, '22023');
select pg_temp.throws('produk di pesanan berjalan ditolak (seluruh batch batal)',
  format($$ select public.admin_delete_products(array[%L, %L]::uuid[]) $$, pg_temp.ctx('b'), pg_temp.ctx('c')),
  'P0001', 'product_in_active_order');
reset role;
select pg_temp.eq('batch yang ditolak tidak menghapus apa pun',
  (select count(*)::int from public.products where id in (pg_temp.ctx('b'), pg_temp.ctx('c'))), 2);

set local role authenticated;
create temp table _paths as
  select unnest(public.admin_delete_products(array[pg_temp.ctx('a'), pg_temp.ctx('c')]::uuid[])) as path;
reset role;

select pg_temp.eq('produk A & C terhapus',
  (select count(*)::int from public.products where id in (pg_temp.ctx('a'), pg_temp.ctx('c'))), 0);
select pg_temp.eq('varian ikut terhapus',
  (select count(*)::int from public.product_variants where sku in ('HAPUS-A', 'HAPUS-C')), 0);
select pg_temp.eq('foto yang jadi snapshot pesanan tidak dikembalikan untuk dihapus',
  (select string_agg(path, ',') from _paths), 'products/a/2.jpg');
select pg_temp.check('riwayat pesanan selesai tetap ada dengan variant_id kosong',
  exists (select 1 from public.order_items
          where order_id = '00000000-0000-0000-0000-0000000000e5'
            and variant_id is null and product_name_snapshot = 'Produk Hapus A'));
select pg_temp.eq('produk B (pesanan berjalan) tetap ada',
  (select count(*)::int from public.products where id = pg_temp.ctx('b')), 1);
