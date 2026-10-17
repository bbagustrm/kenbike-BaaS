-- #110 — Komentar produk: tulis, balas 1 tingkat, baca publik, admin sembunyikan/hapus.

insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000b5', 'k1@test.local', 'authenticated', 'authenticated', '{"full_name":"Kiki Uji"}'),
  ('00000000-0000-0000-0000-0000000000b6', 'k2@test.local', 'authenticated', 'authenticated', '{"full_name":"Lala Uji"}'),
  ('00000000-0000-0000-0000-0000000000b7', 'kadmin@test.local', 'authenticated', 'authenticated', '{"full_name":"Admin Toko"}');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000b7';

create temp table _ctx (key text primary key, id uuid) on commit drop;
grant all on _ctx to public;
create function pg_temp.ctx(p_key text) returns uuid language sql as $$ select id from _ctx where key = p_key $$;
insert into _ctx values ('p', (select product_id from public.product_variants where sku = 'KB-PSS-50'));
insert into _ctx values ('p2', (select id from public.products where is_active and id <> pg_temp.ctx('p') limit 1));

-- ------------------------------------------------------------
-- Anon
-- ------------------------------------------------------------
select pg_temp.login(null);
set local role anon;
select pg_temp.throws('anon tidak bisa berkomentar',
  format($$ select public.post_product_comment(%L, 'Halo') $$, pg_temp.ctx('p')), '42501');
select pg_temp.throws('anon tidak bisa membaca tabel langsung',
  $$ select count(*) from public.product_comments $$, '42501');
reset role;

-- ------------------------------------------------------------
-- Pengguna
-- ------------------------------------------------------------
select pg_temp.login('00000000-0000-0000-0000-0000000000b5');
set local role authenticated;
insert into _ctx select 'q1', public.post_product_comment(pg_temp.ctx('p'), 'Ready ukuran 50 kak?');
insert into _ctx select 'q2', public.post_product_comment(pg_temp.ctx('p'), 'Bisa COD?');
select pg_temp.throws('komentar kosong ditolak',
  format($$ select public.post_product_comment(%L, '   ') $$, pg_temp.ctx('p')), '22023', 'invalid_comment');
select pg_temp.throws('pengguna tidak bisa mengubah komentar',
  $$ update public.product_comments set body = 'diubah' $$, '42501');
select pg_temp.throws('pengguna tidak bisa menyembunyikan komentar',
  format($$ select public.admin_set_comment_hidden(%L, true) $$, pg_temp.ctx('q1')), '42501');
reset role;

select pg_temp.login('00000000-0000-0000-0000-0000000000b6');
set local role authenticated;
insert into _ctx select 'r1', public.post_product_comment(pg_temp.ctx('p'), 'Saya juga mau tanya', pg_temp.ctx('q1'));
select pg_temp.throws('balasan ke balasan ditolak (1 tingkat)',
  format($$ select public.post_product_comment(%L, 'lebih dalam', %L) $$, pg_temp.ctx('p'), pg_temp.ctx('r1')),
  'P0001', 'reply_depth_exceeded');
select pg_temp.throws('balasan ke komentar produk lain ditolak',
  format($$ select public.post_product_comment(%L, 'salah produk', %L) $$, pg_temp.ctx('p2'), pg_temp.ctx('q1')),
  'P0001', 'comment_product_mismatch');
reset role;

-- ------------------------------------------------------------
-- Admin
-- ------------------------------------------------------------
select pg_temp.login('00000000-0000-0000-0000-0000000000b7');
set local role authenticated;
select pg_temp.eq('belum dijawab admin: 2 pertanyaan', public.admin_unanswered_comment_count() >= 2, true);
select pg_temp.check('admin_list_comments: q1 belum dijawab',
  exists (select 1 from public.admin_list_comments('unanswered') where id = pg_temp.ctx('q1')));
insert into _ctx select 'a1', public.post_product_comment(pg_temp.ctx('p'), 'Ready kak!', pg_temp.ctx('q1'));
select pg_temp.check('setelah admin membalas, q1 tidak lagi belum dijawab',
  not exists (select 1 from public.admin_list_comments('unanswered') where id = pg_temp.ctx('q1')));
select pg_temp.lives('admin menyembunyikan q2',
  format($$ select public.admin_set_comment_hidden(%L, true) $$, pg_temp.ctx('q2')));
select pg_temp.check('filter tersembunyi memuat q2',
  exists (select 1 from public.admin_list_comments('hidden') where id = pg_temp.ctx('q2')));
reset role;

-- ------------------------------------------------------------
-- Publik membaca
-- ------------------------------------------------------------
select pg_temp.login(null);
set local role anon;
select pg_temp.eq('publik: hanya komentar yang tidak disembunyikan',
  (select count(*) from public.list_product_comments(pg_temp.ctx('p'), 20) where id in (pg_temp.ctx('q1'), pg_temp.ctx('q2'))),
  1::bigint);
select pg_temp.eq('publik: nama penulis tampil',
  (select author_name from public.list_product_comments(pg_temp.ctx('p'), 20) where id = pg_temp.ctx('q1')), 'Kiki Uji');
select pg_temp.eq('publik: 2 balasan, terlama dulu',
  (select jsonb_array_length(replies) from public.list_product_comments(pg_temp.ctx('p'), 20) where id = pg_temp.ctx('q1')), 2);
select pg_temp.eq('publik: balasan admin bertanda admin',
  (select (replies -> 1 ->> 'author_is_admin')::boolean from public.list_product_comments(pg_temp.ctx('p'), 20)
   where id = pg_temp.ctx('q1')), true);
select pg_temp.eq('jumlah komentar publik (yang terlihat)',
  public.product_comment_count(pg_temp.ctx('p')) >= 1, true);
reset role;

-- Balasan ke komentar tersembunyi ditolak.
select pg_temp.login('00000000-0000-0000-0000-0000000000b6');
set local role authenticated;
select pg_temp.throws('balasan ke komentar tersembunyi ditolak',
  format($$ select public.post_product_comment(%L, 'x', %L) $$, pg_temp.ctx('p'), pg_temp.ctx('q2')), 'P0002');
reset role;

-- Admin menghapus → balasannya ikut terhapus.
select pg_temp.login('00000000-0000-0000-0000-0000000000b7');
set local role authenticated;
select pg_temp.lives('admin menghapus q1', format($$ select public.admin_delete_comment(%L) $$, pg_temp.ctx('q1')));
reset role;
select pg_temp.eq('hapus: balasan ikut terhapus',
  (select count(*) from public.product_comments where parent_id = pg_temp.ctx('q1')), 0::bigint);
