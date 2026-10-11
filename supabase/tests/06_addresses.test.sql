-- #57 — Buku alamat: banyak alamat, tepat satu utama, batas 20.

insert into auth.users (id, email, aud, role, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000c1', 'c1@test.local', 'authenticated', 'authenticated', '{}'),
  ('00000000-0000-0000-0000-0000000000c2', 'c2@test.local', 'authenticated', 'authenticated', '{}');

create function pg_temp.addr(p_label text, p_default boolean default false)
returns uuid
language sql
as $$
  insert into public.addresses (profile_id, label, recipient_name, phone, address_line, city, province, postal_code, is_default)
  values ((select auth.uid()), p_label, 'C', '08123456789', 'Jl. Uji No. 1', 'Bandung', 'Jawa Barat', '40111', p_default)
  returning id
$$;

create function pg_temp.default_label()
returns text
language sql
as $$
  select label from public.addresses where is_default and profile_id = (select auth.uid())
$$;

select pg_temp.login('00000000-0000-0000-0000-0000000000c1');
set local role authenticated;

select pg_temp.addr('Rumah');
select pg_temp.eq('alamat pertama otomatis utama', pg_temp.default_label(), 'Rumah');

select pg_temp.addr('Kantor');
select pg_temp.eq('alamat kedua tidak mengambil alih utama', pg_temp.default_label(), 'Rumah');

select pg_temp.addr('Kos', true);
select pg_temp.eq('alamat baru bertanda utama menggantikan utama lama', pg_temp.default_label(), 'Kos');
select pg_temp.eq('selalu tepat satu alamat utama',
  (select count(*) from public.addresses where is_default), 1::bigint);

update public.addresses set is_default = true where label = 'Kantor';
select pg_temp.eq('set utama lewat update biasa', pg_temp.default_label(), 'Kantor');

select pg_temp.throws('alamat utama tidak bisa dilepas langsung',
  $$ update public.addresses set is_default = false where label = 'Kantor' $$,
  'P0001', 'default_address_required');

select pg_temp.lives('mengubah field lain alamat utama tetap boleh',
  $$ update public.addresses set city = 'Cimahi' where label = 'Kantor' $$);

-- Satu transaksi = created_at sama; bedakan agar "terbaru" jelas.
reset role;
update public.addresses set created_at = now() - interval '1 day' where label = 'Rumah';
set local role authenticated;
delete from public.addresses where label = 'Kantor';
select pg_temp.eq('hapus alamat utama → alamat terbaru jadi utama', pg_temp.default_label(), 'Kos');

select pg_temp.throws('tidak bisa memindahkan alamat ke user lain',
  $$ update public.addresses set profile_id = '00000000-0000-0000-0000-0000000000c2' where label = 'Kos' $$,
  '42501');

-- User lain tidak terpengaruh dan tidak bisa mengubah alamat C1.
select pg_temp.login('00000000-0000-0000-0000-0000000000c2');
select pg_temp.addr('Rumah C2');
select pg_temp.eq('user lain punya alamat utamanya sendiri', pg_temp.default_label(), 'Rumah C2');
update public.addresses set is_default = true where label = 'Rumah';
reset role;
select pg_temp.eq('user lain tidak bisa mengubah utama milik C1',
  (select label from public.addresses
   where is_default and profile_id = '00000000-0000-0000-0000-0000000000c1'), 'Kos');

-- Batas 20 alamat.
select pg_temp.login('00000000-0000-0000-0000-0000000000c1');
set local role authenticated;
select pg_temp.addr('Ekstra ' || n) from generate_series(1, 18) as n;
select pg_temp.eq('20 alamat tersimpan', (select count(*) from public.addresses), 20::bigint);
select pg_temp.throws('alamat ke-21 ditolak',
  $$ select pg_temp.addr('Kelebihan') $$, 'P0001', 'too_many_addresses');
reset role;
