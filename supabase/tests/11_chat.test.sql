-- #98 — Chat: start_conversation, send_message, RLS, unread, status, pesan sistem.

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-0000000000e1', 'e1@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000e2', 'e2@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000ea', 'eadmin@test.local', 'authenticated', 'authenticated');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000ea';

insert into public.addresses (id, profile_id, recipient_name, phone, address_line, city, province, postal_code, biteship_area_id) values
  ('00000000-0000-0000-0000-0000000000e9', '00000000-0000-0000-0000-0000000000e1', 'E1', '08123456780', 'Jl. E No. 1', 'Semarang', 'Jawa Tengah', '50111', 'AREA-E');

create temp table _ctx (key text primary key, id uuid) on commit drop;
grant all on _ctx to public;
create function pg_temp.ctx(p_key text) returns uuid language sql as $$ select id from _ctx where key = p_key $$;
create function pg_temp.conv(p_key text) returns public.conversations language sql security definer as $$
  select * from public.conversations where id = pg_temp.ctx(p_key)
$$;
create function pg_temp.att(p_conv uuid) returns jsonb language sql as $$
  select jsonb_build_array(jsonb_build_object(
    'path', p_conv || '/0a1b2c3d-aaaa-4bbb-8ccc-ddddeeeeffff.png',
    'name', 'foto.png', 'type', 'image/png', 'size', 2048))
$$;

-- Order milik E1.
update public.product_variants set quantity = 10 where sku = 'KB-PSS-50';
insert into public.cart_items (cart_id, variant_id, quantity)
select c.id, (select id from public.product_variants where sku = 'KB-PSS-50'), 1
from public.carts c where c.profile_id = '00000000-0000-0000-0000-0000000000e1';
set local role service_role;
insert into _ctx select 'order', (public.create_order(
  '00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000e9', 'jne', 'reg', 25000)).id;
reset role;

-- ------------------------------------------------------------
-- Anon
-- ------------------------------------------------------------
select pg_temp.login(null);
set local role anon;
select pg_temp.throws('anon tidak bisa memulai chat',
  $$ select public.start_conversation('Halo') $$, '42501');
select pg_temp.throws('anon tidak bisa membaca percakapan',
  $$ select count(*) from public.conversations $$, '42501');
reset role;

-- ------------------------------------------------------------
-- Pembeli E1
-- ------------------------------------------------------------
select pg_temp.login('00000000-0000-0000-0000-0000000000e1');
set local role authenticated;
insert into _ctx select 'general', (public.start_conversation('Tanya ukuran frame')).id;
select pg_temp.lives('pembeli mengirim pesan teks',
  format($$ select public.send_message(%L, 'Tinggi 170 cm cocok ukuran apa?') $$, pg_temp.ctx('general')));
select pg_temp.lives('pembeli mengirim lampiran saja',
  format($$ select public.send_message(%L, '', %L) $$, pg_temp.ctx('general'), pg_temp.att(pg_temp.ctx('general'))));
select pg_temp.throws('pesan kosong ditolak',
  format($$ select public.send_message(%L, '   ') $$, pg_temp.ctx('general')), '22023', 'empty_message');
select pg_temp.throws('lampiran di folder lain ditolak',
  format($$ select public.send_message(%L, 'x', %L) $$, pg_temp.ctx('general'),
         pg_temp.att('00000000-0000-0000-0000-000000000000')), '22023', 'invalid_attachments');
select pg_temp.throws('ukuran lampiran bukan angka ditolak rapi',
  format($$ select public.send_message(%L, 'x', %L) $$, pg_temp.ctx('general'),
         jsonb_build_array(jsonb_build_object('path', pg_temp.ctx('general') || '/0a1b2c3d-aaaa-4bbb-8ccc-ddddeeeeffff.png',
           'name', 'a.png', 'type', 'image/png', 'size', 'besar'))), '22023', 'invalid_attachments');
select pg_temp.throws('pembeli tidak bisa insert pesan langsung',
  format($$ insert into public.messages (conversation_id, sender_role, body) values (%L, 'admin', 'palsu') $$,
         pg_temp.ctx('general')), '42501');

insert into _ctx select 'orderchat', (public.start_conversation('', pg_temp.ctx('order'))).id;
select pg_temp.eq('chat pesanan: subjek otomatis',
  (pg_temp.conv('orderchat')).subject like 'Pesanan KB-%', true);
select pg_temp.eq('chat pesanan: memulai lagi mengembalikan percakapan yang sama',
  (public.start_conversation('Lagi', pg_temp.ctx('order'))).id, pg_temp.ctx('orderchat'));
select pg_temp.eq('pembeli melihat 2 percakapan miliknya',
  (select count(*) from public.conversations), 2::bigint);
select pg_temp.eq('belum ada pesan admin → badge 0', public.unread_conversation_count(), 0);
reset role;

select pg_temp.eq('ringkasan: pengirim terakhir customer', (pg_temp.conv('general')).last_sender::text, 'customer');
select pg_temp.eq('ringkasan: pratinjau lampiran', (pg_temp.conv('general')).last_message_preview, '📎 Lampiran');

-- ------------------------------------------------------------
-- Pembeli lain E2
-- ------------------------------------------------------------
select pg_temp.login('00000000-0000-0000-0000-0000000000e2');
set local role authenticated;
select pg_temp.eq('pembeli lain tidak melihat percakapan E1',
  (select count(*) from public.conversations), 0::bigint);
select pg_temp.eq('pembeli lain tidak melihat pesan E1',
  (select count(*) from public.messages), 0::bigint);
select pg_temp.throws('pembeli lain tidak bisa mengirim ke percakapan E1',
  format($$ select public.send_message(%L, 'nyusup') $$, pg_temp.ctx('general')), 'P0002');
select pg_temp.throws('pembeli lain tidak bisa membuka chat pesanan E1',
  format($$ select public.start_conversation('', %L) $$, pg_temp.ctx('order')), 'P0002');
select pg_temp.throws('pembeli lain tidak bisa menutup percakapan',
  format($$ select public.set_conversation_status(%L, 'closed') $$, pg_temp.ctx('general')), '42501');
reset role;

-- ------------------------------------------------------------
-- Admin
-- ------------------------------------------------------------
select pg_temp.login('00000000-0000-0000-0000-0000000000ea');
set local role authenticated;
select pg_temp.eq('admin: 1 percakapan butuh balasan', public.unread_conversation_count(), 1);
select pg_temp.check('admin melihat semua pesan', (select count(*) from public.messages) >= 2);
select pg_temp.lives('admin membalas',
  format($$ select public.send_message(%L, 'Ukuran 50 cm ya kak') $$, pg_temp.ctx('general')));
select pg_temp.eq('admin: setelah membalas badge 0', public.unread_conversation_count(), 0);
select pg_temp.lives('admin menutup percakapan',
  format($$ select public.set_conversation_status(%L, 'closed') $$, pg_temp.ctx('general')));
reset role;
select pg_temp.eq('balasan admin tercatat sebagai admin',
  (select sender_role::text from public.messages where conversation_id = pg_temp.ctx('general')
   order by created_at desc limit 1), 'admin');

-- ------------------------------------------------------------
-- Pembeli membaca & membalas → percakapan terbuka lagi
-- ------------------------------------------------------------
select pg_temp.login('00000000-0000-0000-0000-0000000000e1');
set local role authenticated;
select pg_temp.eq('pembeli: badge 1 (balasan admin)', public.unread_conversation_count(), 1);
select pg_temp.lives('pembeli menandai dibaca',
  format($$ select public.mark_conversation_read(%L) $$, pg_temp.ctx('general')));
select pg_temp.eq('pembeli: badge 0 setelah dibaca', public.unread_conversation_count(), 0);
select pg_temp.lives('pembeli membalas percakapan yang ditutup',
  format($$ select public.send_message(%L, 'Siap, terima kasih') $$, pg_temp.ctx('general')));
reset role;
select pg_temp.eq('balasan pembeli membuka kembali percakapan', (pg_temp.conv('general')).status::text, 'open');

-- ------------------------------------------------------------
-- Pesan sistem (#101)
-- ------------------------------------------------------------
select pg_temp.login('00000000-0000-0000-0000-0000000000e1');
set local role authenticated;
select pg_temp.throws('pembeli tidak bisa mengirim pesan sistem',
  format($$ select public.post_system_message(%L, 'palsu') $$, pg_temp.ctx('order')), '42501');
reset role;
set local role service_role;
select pg_temp.lives('server mengirim pesan sistem ke chat pesanan',
  format($$ select public.post_system_message(%L, 'Pesanan dibatalkan. Isi rekening untuk refund.') $$, pg_temp.ctx('order')));
reset role;
select pg_temp.eq('pesan sistem masuk ke percakapan pesanan yang sama',
  (select count(*) from public.messages where conversation_id = pg_temp.ctx('orderchat') and sender_role = 'system'),
  1::bigint);
select pg_temp.login('00000000-0000-0000-0000-0000000000e1');
set local role authenticated;
select pg_temp.eq('pesan sistem menaikkan badge pembeli', public.unread_conversation_count(), 1);
reset role;

-- ------------------------------------------------------------
-- Realtime
-- ------------------------------------------------------------
select pg_temp.check('messages & conversations ada di publikasi realtime',
  (select count(*) from pg_publication_tables
   where pubname = 'supabase_realtime' and schemaname = 'public'
     and tablename in ('messages', 'conversations')) = 2);
