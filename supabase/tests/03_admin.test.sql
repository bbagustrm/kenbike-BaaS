-- #34 — RPC admin: produk multi-varian, stok, role.

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000ad', 'admin@test.local', 'authenticated', 'authenticated');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000ad';

create temp table _ctx (key text primary key, id uuid) on commit drop;
grant all on _ctx to public;
create function pg_temp.ctx(p_key text) returns uuid language sql as $$ select id from _ctx where key = p_key $$;

-- Payload dasar: 2 opsi × 2 nilai = 4 varian.
create function pg_temp.payload(p_slug text) returns jsonb language sql as $$
  select jsonb_build_object(
    'category_id', (select id from public.categories where slug = 'aksesoris'),
    'name', 'Jersey Uji',
    'slug', p_slug,
    'description', 'Produk uji',
    'options', jsonb_build_array(
      jsonb_build_object('name', 'Warna', 'values', jsonb_build_array('Merah', 'Biru')),
      jsonb_build_object('name', 'Ukuran', 'values', jsonb_build_array('M', 'L'))
    ),
    'variants', (
      select jsonb_agg(jsonb_build_object(
        -- SKU unik per slug; 'jersey-uji' memakai pola pendek UJI-<warna>-<ukuran>.
        'sku', 'UJI' || case when p_slug = 'jersey-uji' then '' else '-' || p_slug end || '-' || w || '-' || u, 'price', 300000, 'weight_gram', 200,
        'length_cm', 30, 'width_cm', 20, 'height_cm', 3, 'initial_stock', 5,
        'options', jsonb_build_object('Warna', w, 'Ukuran', u)))
      from unnest(array['Merah', 'Biru']) w, unnest(array['M', 'L']) u
    )
  )
$$;

-- ------------------------------------------------------------
-- Customer tidak boleh memakai RPC admin
-- ------------------------------------------------------------
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
set local role authenticated;
select pg_temp.throws('customer: admin_create_product ditolak',
  $$ select public.admin_create_product(pg_temp.payload('jersey-uji-x')) $$, '42501', 'forbidden');
select pg_temp.throws('customer: admin_adjust_stock ditolak',
  $$ select public.admin_adjust_stock(gen_random_uuid(), 1, 'x') $$, '42501', 'forbidden');
reset role;

-- ------------------------------------------------------------
-- admin_create_product
-- ------------------------------------------------------------
select pg_temp.login('00000000-0000-0000-0000-0000000000ad');
set local role authenticated;

insert into _ctx select 'p', public.admin_create_product(pg_temp.payload('jersey-uji'));

select pg_temp.eq('create: 4 varian terbentuk',
  (select count(*) from public.product_variants where product_id = pg_temp.ctx('p')), 4::bigint);
select pg_temp.eq('create: 2 opsi, 4 nilai',
  (select count(*) from public.product_option_values ov join public.product_options o on o.id = ov.option_id
   where o.product_id = pg_temp.ctx('p')), 4::bigint);
select pg_temp.eq('create: setiap varian punya 2 mapping opsi',
  (select count(*) from public.product_variant_options pvo join public.product_variants v on v.id = pvo.variant_id
   where v.product_id = pg_temp.ctx('p')), 8::bigint);
select pg_temp.eq('create: stok awal tercatat di stock_adjustments',
  (select count(*) from public.stock_adjustments a join public.product_variants v on v.id = a.variant_id
   where v.product_id = pg_temp.ctx('p') and a.admin_id = '00000000-0000-0000-0000-0000000000ad'), 4::bigint);
select pg_temp.eq('create: stok awal masuk ke stok tersedia',
  (select sum(available) from public.get_variant_availability(
     array(select id from public.product_variants where product_id = pg_temp.ctx('p')))), 20::bigint);

select pg_temp.throws('create: produk tanpa varian ditolak',
  $$ select public.admin_create_product(pg_temp.payload('jersey-kosong') || '{"variants": []}') $$,
  '22023', 'product_requires_variant');
select pg_temp.throws('create: varian dengan mapping opsi tidak lengkap ditolak',
  $$ select public.admin_create_product(jsonb_set(pg_temp.payload('jersey-kurang'), '{variants,0,options}', '{"Warna":"Merah"}')) $$,
  '22023', 'variant_options_mismatch');
select pg_temp.throws('create: nilai opsi tidak dikenal ditolak',
  $$ select public.admin_create_product(jsonb_set(pg_temp.payload('jersey-asing'), '{variants,0,options}', '{"Warna":"Hijau","Ukuran":"M"}')) $$,
  '22023', 'variant_options_mismatch');
select pg_temp.throws('create: dua varian dengan kombinasi sama ditolak',
  $$ select public.admin_create_product(jsonb_set(jsonb_set(pg_temp.payload('jersey-dobel'),
       '{variants,1,options}', '{"Warna":"Merah","Ukuran":"M"}'), '{variants,1,sku}', '"UJI-DOBEL"')) $$,
  '23505', 'duplicate_variant_combination');

-- Produk tanpa opsi: satu varian "Default".
select pg_temp.lives('create: produk tanpa opsi dengan satu varian',
  $$ select public.admin_create_product(jsonb_build_object(
       'category_id', (select id from public.categories where slug = 'aksesoris'),
       'name', 'Bel Uji', 'slug', 'bel-uji', 'options', '[]'::jsonb,
       'variants', jsonb_build_array(jsonb_build_object('sku', 'UJI-BEL', 'price', 50000, 'weight_gram', 100,
         'length_cm', 10, 'width_cm', 10, 'height_cm', 5, 'options', '{}'::jsonb)))) $$);

-- ------------------------------------------------------------
-- admin_update_product: hapus varian yang belum pernah dipesan,
-- nonaktifkan varian yang sudah pernah dipesan.
-- ------------------------------------------------------------
reset role;
insert into public.orders (id, profile_id, subtotal, total_amount, courier_code, courier_service, shipping_address_snapshot, expires_at)
values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-00000000000a', 300000, 300000, 'jne', 'reg', '{}', now());
insert into public.order_items (order_id, variant_id, quantity, price_at_purchase, weight_gram_snapshot, product_name_snapshot)
select '00000000-0000-0000-0000-0000000000f1', id, 1, 300000, 200, 'Jersey Uji'
from public.product_variants where sku = 'UJI-Biru-L';

select pg_temp.login('00000000-0000-0000-0000-0000000000ad');
set local role authenticated;

-- Pertahankan hanya varian Merah (pakai id agar dianggap varian lama), buang opsi warna Biru.
select pg_temp.lives('update: berjalan',
  $$ select public.admin_update_product(pg_temp.ctx('p'), jsonb_build_object(
       'category_id', (select id from public.categories where slug = 'aksesoris'),
       'name', 'Jersey Uji v2', 'slug', 'jersey-uji',
       'options', jsonb_build_array(
         jsonb_build_object('name', 'Warna', 'values', jsonb_build_array('Merah')),
         jsonb_build_object('name', 'Ukuran', 'values', jsonb_build_array('M', 'L'))),
       'variants', (
         select jsonb_agg(jsonb_build_object('id', v.id, 'sku', v.sku, 'price', 350000, 'weight_gram', 200,
           'length_cm', 30, 'width_cm', 20, 'height_cm', 3,
           'options', jsonb_build_object('Warna', 'Merah', 'Ukuran', split_part(v.sku, '-', 3))))
         from public.product_variants v
         where v.product_id = pg_temp.ctx('p') and v.sku like 'UJI-Merah-%')
     )) $$);
reset role;

select pg_temp.eq('update: nama produk berubah', (select name from public.products where id = pg_temp.ctx('p')), 'Jersey Uji v2');
select pg_temp.eq('update: harga varian berubah', (select price from public.product_variants where sku = 'UJI-Merah-M'), 350000::bigint);
select pg_temp.eq('update: varian belum dipesan dihapus',
  (select count(*) from public.product_variants where sku = 'UJI-Biru-M'), 0::bigint);
select pg_temp.eq('update: varian yang pernah dipesan dinonaktifkan, bukan dihapus',
  (select is_active::text from public.product_variants where sku = 'UJI-Biru-L'), 'false');
select pg_temp.eq('update: 2 varian aktif tersisa',
  (select count(*) from public.product_variants where product_id = pg_temp.ctx('p') and is_active), 2::bigint);
select pg_temp.eq('update: snapshot order tidak terpengaruh',
  (select product_name_snapshot from public.order_items where order_id = '00000000-0000-0000-0000-0000000000f1'), 'Jersey Uji');

-- ------------------------------------------------------------
-- admin_adjust_stock & admin_set_role
-- ------------------------------------------------------------
select pg_temp.login('00000000-0000-0000-0000-0000000000ad');
set local role authenticated;
select pg_temp.throws('adjust: stok tidak boleh negatif',
  $$ select public.admin_adjust_stock((select id from public.product_variants where sku = 'UJI-Merah-M'), -100, 'Koreksi') $$,
  '23514');
select pg_temp.throws('adjust: alasan wajib',
  $$ select public.admin_adjust_stock((select id from public.product_variants where sku = 'UJI-Merah-M'), 1, '  ') $$,
  '22023', 'reason_required');
select pg_temp.eq('adjust: -2 dari 5 menjadi 3',
  public.admin_adjust_stock((select id from public.product_variants where sku = 'UJI-Merah-M'), -2, 'Rusak'), 3);

select pg_temp.throws('set_role: admin terakhir tidak bisa diturunkan',
  $$ select public.admin_set_role('00000000-0000-0000-0000-0000000000ad', 'customer') $$, 'P0001', 'last_admin');
select pg_temp.lives('set_role: promosikan customer A menjadi admin',
  $$ select public.admin_set_role('00000000-0000-0000-0000-00000000000a', 'admin') $$);
select pg_temp.lives('set_role: setelah ada 2 admin, admin lama boleh diturunkan',
  $$ select public.admin_set_role('00000000-0000-0000-0000-0000000000ad', 'customer') $$);
reset role;

select pg_temp.eq('set_role: role A sekarang admin',
  (select role::text from public.profiles where id = '00000000-0000-0000-0000-00000000000a'), 'admin');
