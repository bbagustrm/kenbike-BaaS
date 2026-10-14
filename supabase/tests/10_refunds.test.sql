-- #95 — cancel_paid_order, set_refund_account, complete_refund, RLS refunds.
-- Varian uji: KB-PSS-50 (stok seed = 2).

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-0000000000c1', 'c1@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000c2', 'c2@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000ca', 'cadmin@test.local', 'authenticated', 'authenticated');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000ca';

insert into public.addresses (id, profile_id, recipient_name, phone, address_line, city, province, postal_code, biteship_area_id) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'C1', '08123456780', 'Jl. C No. 1', 'Semarang', 'Jawa Tengah', '50111', 'AREA-C');

create temp table _ctx (key text primary key, id uuid) on commit drop;
grant all on _ctx to public;
insert into _ctx values ('v', (select id from public.product_variants where sku = 'KB-PSS-50'));

create function pg_temp.ctx(p_key text) returns uuid language sql as $$ select id from _ctx where key = p_key $$;
create function pg_temp.qty() returns int language sql security definer as $$
  select quantity from public.product_variants where id = pg_temp.ctx('v')
$$;
create function pg_temp.order_of(p_key text) returns public.orders language sql security definer as $$
  select * from public.orders where id = pg_temp.ctx(p_key)
$$;
create function pg_temp.refund_of(p_key text) returns public.refunds language sql security definer as $$
  select * from public.refunds where order_id = pg_temp.ctx(p_key)
$$;
-- Order lunas 1 unit milik C1 (lewat service role, sama seperti webhook).
create function pg_temp.paid_order(p_key text) returns void language plpgsql as $$
begin
  insert into public.cart_items (cart_id, variant_id, quantity)
  select c.id, pg_temp.ctx('v'), 1 from public.carts c
  where c.profile_id = '00000000-0000-0000-0000-0000000000c1'
  on conflict (cart_id, variant_id) do update set quantity = 1;
  insert into _ctx select p_key, (public.create_order(
    '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1', 'jne', 'reg', 25000)).id;
  perform public.confirm_payment(pg_temp.ctx(p_key));
end;
$$;

-- Stok uji 10 (di-rollback bersama tes).
update public.product_variants set quantity = 10 where id = pg_temp.ctx('v');

set local role service_role;
select pg_temp.paid_order('o1');
select pg_temp.paid_order('o2');
reset role;
select pg_temp.eq('fixture: stok 8 setelah 2 order lunas', pg_temp.qty(), 8);

-- o3: bayar telat saat stok habis → lunas tanpa memotong stok, perlu tindakan.
set local role service_role;
insert into public.cart_items (cart_id, variant_id, quantity)
select c.id, pg_temp.ctx('v'), 1 from public.carts c
where c.profile_id = '00000000-0000-0000-0000-0000000000c1'
on conflict (cart_id, variant_id) do update set quantity = 1;
insert into _ctx select 'o3', (public.create_order(
  '00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1', 'jne', 'reg', 25000)).id;
select public.release_reservations(pg_temp.ctx('o3'));
update public.product_variants set quantity = 0 where id = pg_temp.ctx('v');
select public.confirm_payment(pg_temp.ctx('o3'));
update public.product_variants set quantity = 8 where id = pg_temp.ctx('v');
reset role;
select pg_temp.eq('fixture: o3 tanpa stok perlu tindakan',
  (pg_temp.order_of('o3')).attention_reason::text, 'late_payment_out_of_stock');

-- ------------------------------------------------------------
-- cancel_paid_order
-- ------------------------------------------------------------
select pg_temp.login(null);
set local role anon;
select pg_temp.throws('anon tidak bisa membatalkan',
  format($$ select public.cancel_paid_order(%L, 'x') $$, pg_temp.ctx('o1')), '42501');
reset role;

select pg_temp.login('00000000-0000-0000-0000-0000000000c2');
set local role authenticated;
select pg_temp.throws('pembeli lain tidak bisa membatalkan (seolah tidak ada)',
  format($$ select public.cancel_paid_order(%L, 'Salah pesan') $$, pg_temp.ctx('o1')), 'P0002');
reset role;

select pg_temp.login('00000000-0000-0000-0000-0000000000c1');
set local role authenticated;
select pg_temp.throws('alasan wajib',
  format($$ select public.cancel_paid_order(%L, '   ') $$, pg_temp.ctx('o1')), '22023');
select pg_temp.lives('pembeli membatalkan order lunas miliknya (restock=false diabaikan)',
  format($$ select public.cancel_paid_order(%L, 'Salah pilih ukuran', false) $$, pg_temp.ctx('o1')));
select pg_temp.throws('tidak bisa dibatalkan dua kali',
  format($$ select public.cancel_paid_order(%L, 'Lagi') $$, pg_temp.ctx('o1')), 'P0001');
select pg_temp.eq('pembeli bisa membaca refund miliknya',
  (select count(*) from public.refunds where order_id = pg_temp.ctx('o1')), 1::bigint);
select pg_temp.throws('pembeli tidak bisa menulis refunds langsung',
  format($$ update public.refunds set status = 'completed' where order_id = %L $$, pg_temp.ctx('o1')), '42501');
reset role;

select pg_temp.eq('batal: payment_status refund_pending', (pg_temp.order_of('o1')).payment_status::text, 'refund_pending');
select pg_temp.eq('batal: shipping_status cancelled', (pg_temp.order_of('o1')).shipping_status::text, 'cancelled');
select pg_temp.eq('batal: stok kembali 9', pg_temp.qty(), 9);
select pg_temp.eq('batal: refund penuh = total order',
  (pg_temp.refund_of('o1')).amount, (pg_temp.order_of('o1')).total_amount);
select pg_temp.eq('batal: diminta oleh customer', (pg_temp.refund_of('o1')).requested_by::text, 'customer');
select pg_temp.eq('batal: menunggu rekening', (pg_temp.refund_of('o1')).status::text, 'awaiting_account');
select pg_temp.eq('batal: reservasi dilepas',
  (select count(*) from public.stock_reservations where order_id = pg_temp.ctx('o1') and status = 'confirmed'), 0::bigint);
select pg_temp.check('batal: penyesuaian stok tercatat',
  exists (select 1 from public.stock_adjustments where variant_id = pg_temp.ctx('v') and delta = 1
          and reason like 'Pembatalan pesanan %'));
select pg_temp.eq('batal: timeline mencatat refund_pending',
  (select count(*) from public.order_status_history
   where order_id = pg_temp.ctx('o1') and status_value in ('refund_pending', 'cancelled')), 2::bigint);

select pg_temp.login('00000000-0000-0000-0000-0000000000c2');
set local role authenticated;
select pg_temp.eq('pembeli lain tidak melihat refund',
  (select count(*) from public.refunds where order_id = pg_temp.ctx('o1')), 0::bigint);
reset role;

-- Admin: tanpa restock (barang rusak) & order bayar-telat-tanpa-stok.
select pg_temp.login('00000000-0000-0000-0000-0000000000ca');
set local role authenticated;
select pg_temp.lives('admin membatalkan tanpa mengembalikan stok',
  format($$ select public.cancel_paid_order(%L, 'Barang rusak', false) $$, pg_temp.ctx('o2')));
select pg_temp.lives('admin membatalkan order bayar telat tanpa stok',
  format($$ select public.cancel_paid_order(%L, 'Stok habis') $$, pg_temp.ctx('o3')));
reset role;
select pg_temp.eq('admin restock=false: stok tetap 9', pg_temp.qty(), 9);
select pg_temp.eq('admin: diminta oleh admin', (pg_temp.refund_of('o2')).requested_by::text, 'admin');
select pg_temp.check('o3: tanda perlu tindakan dihapus', (pg_temp.order_of('o3')).attention_reason is null);
select pg_temp.eq('o3: tidak ada stok yang dikembalikan', pg_temp.qty(), 9);

-- Paket sudah diambil kurir → tidak bisa dibatalkan.
set local role service_role;
select pg_temp.paid_order('o4');
update public.orders set shipping_status = 'shipped' where id = pg_temp.ctx('o4');
reset role;
select pg_temp.login('00000000-0000-0000-0000-0000000000c1');
set local role authenticated;
select pg_temp.throws('order yang sudah dikirim tidak bisa dibatalkan',
  format($$ select public.cancel_paid_order(%L, 'Berubah pikiran') $$, pg_temp.ctx('o4')), 'P0001');

-- ------------------------------------------------------------
-- set_refund_account
-- ------------------------------------------------------------
select pg_temp.throws('nomor rekening tidak valid',
  format($$ select public.set_refund_account(%L, 'BCA', '12ab', 'Budi') $$, pg_temp.ctx('o1')), '22023');
select pg_temp.lives('pembeli mengisi rekening (spasi/strip dibuang)',
  format($$ select public.set_refund_account(%L, 'BCA', '1234-5678 90', 'Budi Santoso') $$, pg_temp.ctx('o1')));
select pg_temp.throws('pembeli tidak bisa menyelesaikan refund',
  format($$ select public.complete_refund(%L, null, 'sudah') $$, pg_temp.ctx('o1')), '42501');
reset role;
select pg_temp.eq('rekening: status pending_transfer', (pg_temp.refund_of('o1')).status::text, 'pending_transfer');
select pg_temp.eq('rekening: nomor dinormalisasi', (pg_temp.refund_of('o1')).account_number::text, '1234567890');

select pg_temp.login('00000000-0000-0000-0000-0000000000c2');
set local role authenticated;
select pg_temp.throws('pembeli lain tidak bisa mengisi rekening',
  format($$ select public.set_refund_account(%L, 'BCA', '1234567890', 'Maling') $$, pg_temp.ctx('o1')), 'P0001');
reset role;

-- ------------------------------------------------------------
-- complete_refund
-- ------------------------------------------------------------
select pg_temp.login('00000000-0000-0000-0000-0000000000ca');
set local role authenticated;
select pg_temp.throws('bukti atau catatan wajib',
  format($$ select public.complete_refund(%L, null, '  ') $$, pg_temp.ctx('o1')), '22023');
select pg_temp.throws('path bukti harus di folder order',
  format($$ select public.complete_refund(%L, 'lain/bukti.png', null) $$, pg_temp.ctx('o1')), '22023');
select pg_temp.lives('admin menyelesaikan refund dengan bukti',
  format($$ select public.complete_refund(%L, %L, 'Transfer BCA') $$, pg_temp.ctx('o1'), pg_temp.ctx('o1') || '/bukti.png'));
select pg_temp.throws('refund selesai tidak bisa diselesaikan lagi',
  format($$ select public.complete_refund(%L, null, 'lagi') $$, pg_temp.ctx('o1')), 'P0002');
select pg_temp.lives('refund via dashboard Midtrans tanpa rekening (catatan saja)',
  format($$ select public.complete_refund(%L, null, 'Refund via Midtrans') $$, pg_temp.ctx('o2')));
reset role;
select pg_temp.eq('selesai: order refunded', (pg_temp.order_of('o1')).payment_status::text, 'refunded');
select pg_temp.eq('selesai: refund completed', (pg_temp.refund_of('o1')).status::text, 'completed');
select pg_temp.check('selesai: diproses admin tercatat',
  (pg_temp.refund_of('o1')).processed_by = '00000000-0000-0000-0000-0000000000ca'
  and (pg_temp.refund_of('o1')).processed_at is not null);

select pg_temp.login('00000000-0000-0000-0000-0000000000c1');
set local role authenticated;
select pg_temp.throws('rekening tidak bisa diubah setelah refund selesai',
  format($$ select public.set_refund_account(%L, 'BNI', '9999999', 'Budi') $$, pg_temp.ctx('o1')), 'P0001');
reset role;
