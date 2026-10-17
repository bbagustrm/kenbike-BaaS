-- #106 — Ulasan: submit_order_review, agregat rating, RPC publik, admin.

insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a5', 'r1@test.local', 'authenticated', 'authenticated', '{"full_name":"Rina Uji"}'),
  ('00000000-0000-0000-0000-0000000000a6', 'r2@test.local', 'authenticated', 'authenticated', '{}'),
  ('00000000-0000-0000-0000-0000000000a7', 'radmin@test.local', 'authenticated', 'authenticated', '{}');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000a7';

insert into public.addresses (id, profile_id, recipient_name, phone, address_line, city, province, postal_code, biteship_area_id) values
  ('00000000-0000-0000-0000-0000000000a8', '00000000-0000-0000-0000-0000000000a5', 'R1', '08123456780', 'Jl. R No. 1', 'Semarang', 'Jawa Tengah', '50111', 'AREA-R');

create temp table _ctx (key text primary key, id uuid) on commit drop;
grant all on _ctx to public;
create function pg_temp.ctx(p_key text) returns uuid language sql as $$ select id from _ctx where key = p_key $$;
insert into _ctx values ('v', (select id from public.product_variants where sku = 'KB-PSS-50'));
insert into _ctx values ('p', (select product_id from public.product_variants where sku = 'KB-PSS-50'));
create function pg_temp.product() returns public.products language sql security definer as $$
  select * from public.products where id = pg_temp.ctx('p')
$$;
create function pg_temp.photo(p_uid uuid) returns text[] language sql as $$
  select array[p_uid || '/0a1b2c3d-aaaa-4bbb-8ccc-ddddeeeeffff.jpg']
$$;

-- Pesanan R1: o1 delivered, o2 masih dikirim.
update public.product_variants set quantity = 10 where id = pg_temp.ctx('v');
create function pg_temp.paid_order(p_key text) returns void language plpgsql as $$
begin
  insert into public.cart_items (cart_id, variant_id, quantity)
  select c.id, pg_temp.ctx('v'), 1 from public.carts c
  where c.profile_id = '00000000-0000-0000-0000-0000000000a5'
  on conflict (cart_id, variant_id) do update set quantity = 1;
  insert into _ctx select p_key, (public.create_order(
    '00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000a8', 'jne', 'reg', 25000)).id;
  perform public.confirm_payment(pg_temp.ctx(p_key));
end;
$$;
set local role service_role;
select pg_temp.paid_order('o1');
select pg_temp.paid_order('o2');
update public.orders set shipping_status = 'delivered' where id = pg_temp.ctx('o1');
update public.orders set shipping_status = 'shipped' where id = pg_temp.ctx('o2');
reset role;

select pg_temp.eq('awal: produk belum punya ulasan (dari fixture)',
  (select count(*) from public.review_products where product_id = pg_temp.ctx('p')), 0::bigint);

-- ------------------------------------------------------------
-- Pembeli
-- ------------------------------------------------------------
select pg_temp.login('00000000-0000-0000-0000-0000000000a5');
set local role authenticated;
select pg_temp.check('pesanan delivered muncul di daftar perlu diulas',
  exists (select 1 from public.pending_review_orders() where order_id = pg_temp.ctx('o1')));
select pg_temp.check('pesanan yang masih dikirim tidak muncul',
  not exists (select 1 from public.pending_review_orders() where order_id = pg_temp.ctx('o2')));
select pg_temp.throws('belum delivered ditolak',
  format($$ select public.submit_order_review(%L, 5) $$, pg_temp.ctx('o2')), 'P0001', 'order_not_delivered');
select pg_temp.throws('rating 0 ditolak',
  format($$ select public.submit_order_review(%L, 0) $$, pg_temp.ctx('o1')), '22023', 'invalid_rating');
select pg_temp.throws('foto di folder orang lain ditolak',
  format($$ select public.submit_order_review(%L, 5, '', %L) $$, pg_temp.ctx('o1'),
         pg_temp.photo('00000000-0000-0000-0000-0000000000a6')), '22023', 'invalid_photos');
select pg_temp.lives('pembeli mengulas pesanan delivered (bintang + teks + foto)',
  format($$ select public.submit_order_review(%L, 4, 'Mantul, ori!', %L) $$, pg_temp.ctx('o1'),
         pg_temp.photo('00000000-0000-0000-0000-0000000000a5')));
select pg_temp.throws('ulasan kedua untuk pesanan yang sama ditolak',
  format($$ select public.submit_order_review(%L, 5) $$, pg_temp.ctx('o1')), 'P0001', 'already_reviewed');
select pg_temp.eq('pembeli melihat ulasannya sendiri',
  (select rating from public.my_order_review(pg_temp.ctx('o1'))), 4::smallint);
select pg_temp.eq('pembeli tidak bisa membaca tabel reviews langsung',
  (select count(*) from public.reviews), 0::bigint);
select pg_temp.throws('pembeli tidak bisa mengubah ulasan',
  $$ update public.reviews set rating = 5 $$, '42501');
reset role;

select pg_temp.eq('agregat: 1 ulasan', (pg_temp.product()).rating_count, 1);
select pg_temp.eq('agregat: rata-rata 4', (pg_temp.product()).rating_avg, 4.00::numeric);

select pg_temp.login('00000000-0000-0000-0000-0000000000a6');
set local role authenticated;
select pg_temp.throws('pembeli lain tidak bisa mengulas pesanan R1',
  format($$ select public.submit_order_review(%L, 1) $$, pg_temp.ctx('o1')), 'P0002');
select pg_temp.throws('pembeli tidak bisa mengimpor ulasan',
  format($$ select public.admin_import_review(%L, 'Palsu', 5) $$, pg_temp.ctx('p')), '42501');
reset role;

-- ------------------------------------------------------------
-- Publik (anon)
-- ------------------------------------------------------------
select pg_temp.login(null);
set local role anon;
select pg_temp.eq('anon membaca ulasan produk + nama pengulas',
  (select reviewer_name from public.list_product_reviews(pg_temp.ctx('p')) limit 1), 'Rina Uji');
select pg_temp.eq('anon melihat foto ulasan',
  (select cardinality(photos) from public.list_product_reviews(pg_temp.ctx('p')) limit 1), 1);
select pg_temp.eq('ringkasan: distribusi bintang 4 = 1',
  ((select distribution from public.product_rating_summary(pg_temp.ctx('p'))) ->> '4')::int, 1);
select pg_temp.eq('filter bintang 5 kosong',
  (select count(*) from public.list_product_reviews(pg_temp.ctx('p'), 5)), 0::bigint);
select pg_temp.throws('anon tidak bisa membaca tabel reviews',
  $$ select count(*) from public.reviews $$, '42501');
reset role;

-- ------------------------------------------------------------
-- Admin: impor, balas, hapus, proteksi kolom rating
-- ------------------------------------------------------------
select pg_temp.login('00000000-0000-0000-0000-0000000000a7');
set local role authenticated;
insert into _ctx select 'imp', public.admin_import_review(
  pg_temp.ctx('p'), 'Andi (Shopee)', 2, 'Pengiriman agak lama', '2026-01-10T08:00:00Z', '{}', 'Ukuran 50');
select pg_temp.lives('admin membalas ulasan',
  format($$ select public.admin_reply_review(%L, 'Mohon maaf kak, kami perbaiki') $$, pg_temp.ctx('imp')));
select pg_temp.throws('tanggal impor di masa depan ditolak',
  format($$ select public.admin_import_review(%L, 'X', 5, '', now() + interval '1 day') $$, pg_temp.ctx('p')),
  '22023', 'invalid_review_date');
update public.products set rating_avg = 5, rating_count = 999 where id = pg_temp.ctx('p');
reset role;

select pg_temp.eq('impor: rata-rata (4+2)/2 = 3', (pg_temp.product()).rating_avg, 3.00::numeric);
select pg_temp.eq('update manual rating diabaikan', (pg_temp.product()).rating_count, 2);
select pg_temp.eq('ulasan impor memakai tanggal asli',
  (select created_at from public.reviews where id = pg_temp.ctx('imp')), '2026-01-10T08:00:00Z'::timestamptz);

select pg_temp.login(null);
set local role anon;
select pg_temp.eq('urutan terbaru dulu: ulasan pembeli sebelum impor lama',
  (select reviewer_name from public.list_product_reviews(pg_temp.ctx('p')) limit 1), 'Rina Uji');
select pg_temp.eq('balasan admin terbaca publik',
  (select admin_reply from public.list_product_reviews(pg_temp.ctx('p'), 2)), 'Mohon maaf kak, kami perbaiki');
reset role;

select pg_temp.login('00000000-0000-0000-0000-0000000000a7');
set local role authenticated;
select pg_temp.lives('admin menghapus ulasan impor',
  format($$ select public.admin_delete_review(%L) $$, pg_temp.ctx('imp')));
reset role;
select pg_temp.eq('hapus: agregat kembali 1 ulasan', (pg_temp.product()).rating_count, 1);
select pg_temp.eq('hapus: rata-rata kembali 4', (pg_temp.product()).rating_avg, 4.00::numeric);

-- Modal "Nanti"
set local role service_role;
update public.orders set shipping_status = 'delivered' where id = pg_temp.ctx('o2');
reset role;
select pg_temp.login('00000000-0000-0000-0000-0000000000a5');
set local role authenticated;
select pg_temp.lives('pembeli menutup modal (Nanti)',
  format($$ select public.dismiss_review_prompt(%L) $$, pg_temp.ctx('o2')));
select pg_temp.check('setelah Nanti: tidak muncul di modal',
  not exists (select 1 from public.pending_review_orders(true) where order_id = pg_temp.ctx('o2')));
select pg_temp.check('setelah Nanti: tetap bisa diulas dari detail pesanan',
  exists (select 1 from public.pending_review_orders(false) where order_id = pg_temp.ctx('o2')));
reset role;
