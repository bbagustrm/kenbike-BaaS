-- #48 — Uji kontrak: payload yang dihasilkan form admin (toRpcPayload di
-- features/admin/products/schemas.ts) diterima RPC admin_create_product /
-- admin_update_product. Payload di bawah dihasilkan dari toRpcPayload; jika
-- bentuk form berubah, perbarui fixture ini.

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-0000000000ad', 'admin@test.local', 'authenticated', 'authenticated');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000ad';

create temp table _ctx (key text primary key, id uuid) on commit drop;
grant all on _ctx to public;
create function pg_temp.ctx(p_key text) returns uuid language sql as $$ select id from _ctx where key = p_key $$;

create function pg_temp.form_payload() returns jsonb language sql as $$
  select jsonb_set(
    '{"category_id":"11111111-2222-4333-8444-555555555555","name":"Jersey Kontrak","slug":"jersey-kontrak","description":null,"is_active":true,"options":[{"name":"Warna","values":["Merah","Biru"]},{"name":"Ukuran","values":["M","L"]}],"variants":[{"initial_stock":3,"sku":"KB-JK-MERAH-M","price":250000,"weight_gram":200,"length_cm":30,"width_cm":20,"height_cm":3,"is_active":true,"options":{"Warna":"Merah","Ukuran":"M"}},{"initial_stock":3,"sku":"KB-JK-MERAH-L","price":250000,"weight_gram":200,"length_cm":30,"width_cm":20,"height_cm":3,"is_active":true,"options":{"Warna":"Merah","Ukuran":"L"}},{"initial_stock":3,"sku":"KB-JK-BIRU-M","price":250000,"weight_gram":200,"length_cm":30,"width_cm":20,"height_cm":3,"is_active":true,"options":{"Warna":"Biru","Ukuran":"M"}},{"initial_stock":3,"sku":"KB-JK-BIRU-L","price":250000,"weight_gram":200,"length_cm":30,"width_cm":20,"height_cm":3,"is_active":true,"options":{"Warna":"Biru","Ukuran":"L"}}]}'::jsonb,
    '{category_id}',
    to_jsonb((select id from public.categories where slug = 'aksesoris'))
  )
$$;

select pg_temp.login('00000000-0000-0000-0000-0000000000ad');
set local role authenticated;

insert into _ctx select 'p', public.admin_create_product(pg_temp.form_payload());

select pg_temp.eq('form → create: 4 varian dari 2×2 opsi',
  (select count(*) from public.product_variants where product_id = pg_temp.ctx('p')), 4::bigint);
select pg_temp.eq('form → create: deskripsi kosong disimpan sebagai NULL',
  (select description from public.products where id = pg_temp.ctx('p')), null::text);
select pg_temp.eq('form → create: stok awal per varian',
  (select sum(available) from public.admin_get_stock(
     array(select id from public.product_variants where product_id = pg_temp.ctx('p')))), 12::bigint);

-- Simulasi simpan ulang dari form edit: varian lama membawa id (tanpa initial_stock),
-- warna Biru dibuang dari opsi, harga diubah.
select pg_temp.lives('form → update: payload edit diterima',
  $$ select public.admin_update_product(pg_temp.ctx('p'), jsonb_build_object(
       'category_id', (select id from public.categories where slug = 'aksesoris'),
       'name', 'Jersey Kontrak v2', 'slug', 'jersey-kontrak', 'description', null, 'is_active', true,
       'options', '[{"name":"Warna","values":["Merah"]},{"name":"Ukuran","values":["M","L"]}]'::jsonb,
       'variants', (
         select jsonb_agg(jsonb_build_object(
           'id', v.id, 'sku', v.sku, 'price', 275000, 'weight_gram', 200,
           'length_cm', 30, 'width_cm', 20, 'height_cm', 3, 'is_active', true,
           'options', jsonb_build_object('Warna', 'Merah', 'Ukuran', split_part(v.sku, '-', 4))))
         from public.product_variants v
         where v.product_id = pg_temp.ctx('p') and v.sku like 'KB-JK-MERAH-%')
     )) $$);
reset role;

select pg_temp.eq('form → update: varian Biru (belum dipesan) dihapus',
  (select count(*) from public.product_variants where product_id = pg_temp.ctx('p')), 2::bigint);
select pg_temp.eq('form → update: harga baru tersimpan',
  (select min(price) from public.product_variants where product_id = pg_temp.ctx('p')), 275000::bigint);
select pg_temp.eq('form → update: stok varian lama tidak berubah',
  (select quantity from public.product_variants where sku = 'KB-JK-MERAH-M'), 3);
