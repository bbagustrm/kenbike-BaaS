-- Pre-order per produk: stok & checkout sama dengan produk biasa, estimasi
-- pengiriman disnapshot ke order_items.

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000ad', 'admin@test.local', 'authenticated', 'authenticated');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000ad';

insert into public.addresses (id, profile_id, recipient_name, phone, address_line, city, province, postal_code)
values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000a', 'A', '08123456780',
        'Jl. A No. 1', 'Semarang', 'Jawa Tengah', '50111');

create temp table _ctx (key text primary key, id uuid) on commit drop;
grant all on _ctx to public;
create function pg_temp.ctx(p_key text) returns uuid language sql as $$ select id from _ctx where key = p_key $$;

create function pg_temp.payload(p_slug text, p_preorder boolean, p_days int) returns jsonb language sql as $$
  select jsonb_build_object(
    'category_id', (select id from public.categories where slug = 'aksesoris'),
    'name', 'Uji ' || p_slug, 'slug', p_slug, 'is_active', true,
    'is_preorder', p_preorder, 'preorder_days', p_days,
    'options', '[]'::jsonb,
    'variants', jsonb_build_array(jsonb_build_object(
      'sku', upper(p_slug), 'price', 100000, 'weight_gram', 500,
      'length_cm', 10, 'width_cm', 10, 'height_cm', 10, 'initial_stock', 2, 'options', '{}'::jsonb)))
$$;

select pg_temp.login('00000000-0000-0000-0000-0000000000ad');
set local role authenticated;
insert into _ctx select 'po', public.admin_create_product(pg_temp.payload('uji-po', true, 14));
select pg_temp.throws('pre-order tanpa estimasi hari ditolak',
  $$ select public.admin_create_product(pg_temp.payload('uji-po-kosong', true, null)) $$, '23514');
select pg_temp.throws('estimasi di luar 1–365 hari ditolak',
  $$ select public.admin_create_product(pg_temp.payload('uji-po-lama', true, 400)) $$, '23514');
reset role;

select pg_temp.eq('pre-order tersimpan di produk',
  (select is_preorder::text || '/' || preorder_days from public.products where id = pg_temp.ctx('po')), 'true/14');

select pg_temp.login(null);
set local role anon;
select pg_temp.eq('product_listings menampilkan info pre-order ke publik',
  (select preorder_days from public.product_listings where slug = 'uji-po'), 14);
reset role;

-- Checkout produk pre-order: stok tetap dicek & di-reserve, estimasi disnapshot.
insert into public.cart_items (cart_id, variant_id, quantity)
select c.id, v.id, 2
from public.carts c, public.product_variants v
where c.profile_id = '00000000-0000-0000-0000-00000000000a' and v.sku = 'UJI-PO';

set local role service_role;
insert into _ctx
select 'order', (public.create_order(
  '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', 'jne', 'reg', 20000
)).id;
reset role;

select pg_temp.eq('order item menyimpan snapshot estimasi pre-order',
  (select preorder_days_snapshot from public.order_items where order_id = pg_temp.ctx('order')), 14);
select pg_temp.eq('stok pre-order ikut ter-reserve seperti biasa',
  (select available from public.get_variant_availability(array(select id from public.product_variants where sku = 'UJI-PO'))), 0);

-- Mengubah pre-order setelah order dibuat tidak mengubah snapshot.
update public.products set is_preorder = false, preorder_days = null where id = pg_temp.ctx('po');
select pg_temp.eq('snapshot tidak berubah walau produk diubah',
  (select preorder_days_snapshot from public.order_items where order_id = pg_temp.ctx('order')), 14);

-- Produk biasa: snapshot null.
insert into public.cart_items (cart_id, variant_id, quantity)
select c.id, v.id, 1
from public.carts c, public.product_variants v
where c.profile_id = '00000000-0000-0000-0000-00000000000a' and v.sku = 'KB-PMG';
set local role service_role;
insert into _ctx
select 'order2', (public.create_order(
  '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', 'jne', 'reg', 20000
)).id;
reset role;
select pg_temp.check('produk biasa: snapshot pre-order kosong',
  (select preorder_days_snapshot is null from public.order_items where order_id = pg_temp.ctx('order2')));
