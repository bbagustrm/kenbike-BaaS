-- #34 — RPC transaksi: create_order, confirm_payment, expire, bayar telat, cancel.
-- Varian uji: KB-PSS-50 (Polygon Strattos S3, ukuran 50) dengan stok seed = 2.

insert into auth.users (id, email, aud, role) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000ad', 'admin@test.local', 'authenticated', 'authenticated');
update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-0000000000ad';

insert into public.addresses (id, profile_id, recipient_name, phone, address_line, city, province, postal_code, biteship_area_id) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000a', 'A', '08123456780', 'Jl. A No. 1', 'Semarang', 'Jawa Tengah', '50111', 'AREA-A'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000000b', 'B', '08123456781', 'Jl. B No. 2', 'Bandung', 'Jawa Barat', '40111', 'AREA-B');

create temp table _ctx (key text primary key, id uuid) on commit drop;
grant all on _ctx to public;
insert into _ctx values ('v', (select id from public.product_variants where sku = 'KB-PSS-50'));

create function pg_temp.ctx(p_key text) returns uuid language sql as $$ select id from _ctx where key = p_key $$;
create function pg_temp.avail() returns int language sql as $$
  select available from public.get_variant_availability(array[pg_temp.ctx('v')])
$$;
create function pg_temp.qty() returns int language sql as $$
  select quantity from public.product_variants where id = pg_temp.ctx('v')
$$;
create function pg_temp.add_to_cart(p_profile uuid, p_qty int) returns void language sql as $$
  insert into public.cart_items (cart_id, variant_id, quantity)
  select c.id, pg_temp.ctx('v'), p_qty from public.carts c where c.profile_id = p_profile
  on conflict (cart_id, variant_id) do update set quantity = excluded.quantity
$$;
create function pg_temp.order_of(p_key text) returns public.orders language sql as $$
  select * from public.orders where id = pg_temp.ctx(p_key)
$$;
create function pg_temp.expire(p_key text) returns void language sql as $$
  update public.orders set expires_at = now() - interval '1 minute' where id = pg_temp.ctx(p_key);
  update public.stock_reservations set expires_at = now() - interval '1 minute' where order_id = pg_temp.ctx(p_key);
$$;

select pg_temp.eq('fixture: stok awal varian uji = 2', pg_temp.qty(), 2);

-- ------------------------------------------------------------
-- create_order
-- ------------------------------------------------------------
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
set local role authenticated;
select pg_temp.lives('customer A menambah item ke cart sendiri',
  $$ select pg_temp.add_to_cart('00000000-0000-0000-0000-00000000000a', 1) $$);
reset role;

set local role service_role;
insert into _ctx
select 'orderA', (public.create_order(
  '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', 'jne', 'reg', 25000, 'Tolong dibungkus rapi'
)).id;
reset role;

select pg_temp.eq('create_order: total = harga + ongkir', (pg_temp.order_of('orderA')).total_amount, 12900000::bigint + 25000);
select pg_temp.check('create_order: nomor order berformat KB-YYYYMMDD-NNNN',
  (pg_temp.order_of('orderA')).order_number ~ '^KB-[0-9]{8}-[0-9]{4,}$');
select pg_temp.eq('create_order: status pending_payment', (pg_temp.order_of('orderA')).payment_status::text, 'pending_payment');
select pg_temp.check('create_order: kadaluarsa ~24 jam',
  (pg_temp.order_of('orderA')).expires_at between now() + interval '23 hours 59 minutes' and now() + interval '24 hours 1 minute');
select pg_temp.eq('create_order: snapshot alamat tersimpan',
  (pg_temp.order_of('orderA')).shipping_address_snapshot ->> 'biteship_area_id', 'AREA-A');
select pg_temp.eq('create_order: snapshot nama & label varian',
  (select product_name_snapshot || ' / ' || variant_label_snapshot from public.order_items where order_id = pg_temp.ctx('orderA')),
  'Polygon Strattos S3 / 50');
select pg_temp.eq('create_order: cart dikosongkan',
  (select count(*) from public.cart_items ci join public.carts c on c.id = ci.cart_id
   where c.profile_id = '00000000-0000-0000-0000-00000000000a'), 0::bigint);
select pg_temp.eq('create_order: reservasi dibuat', (select count(*) from public.stock_reservations
  where order_id = pg_temp.ctx('orderA') and status = 'reserved'), 1::bigint);
select pg_temp.eq('create_order: stok fisik belum berkurang', pg_temp.qty(), 2);
select pg_temp.eq('create_order: stok tersedia berkurang', pg_temp.avail(), 1);

-- Stok tidak cukup
select pg_temp.add_to_cart('00000000-0000-0000-0000-00000000000b', 2);
set local role service_role;
select pg_temp.throws('create_order: stok tidak cukup ditolak',
  $$ select public.create_order('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000b1', 'jne', 'reg', 25000) $$,
  'P0001', 'insufficient_stock');
select pg_temp.throws('create_order: alamat milik orang lain ditolak',
  $$ select public.create_order('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000a1', 'jne', 'reg', 25000) $$,
  'P0002', 'address_not_found');
select pg_temp.throws('create_order: ongkir negatif ditolak',
  $$ select public.create_order('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000b1', 'jne', 'reg', -1) $$,
  '22023');
select pg_temp.throws('create_order: cart kosong ditolak',
  $$ select public.create_order('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', 'jne', 'reg', 0) $$,
  'P0001', 'cart_empty');
reset role;
select pg_temp.eq('create_order gagal: cart B tetap utuh',
  (select sum(quantity) from public.cart_items ci join public.carts c on c.id = ci.cart_id
   where c.profile_id = '00000000-0000-0000-0000-00000000000b'), 2::bigint);

-- ------------------------------------------------------------
-- confirm_payment (normal + idempoten)
-- ------------------------------------------------------------
set local role service_role;
select public.confirm_payment(pg_temp.ctx('orderA'));
reset role;
select pg_temp.eq('confirm: status paid', (pg_temp.order_of('orderA')).payment_status::text, 'paid');
select pg_temp.eq('confirm: shipping_status pending', (pg_temp.order_of('orderA')).shipping_status::text, 'pending');
select pg_temp.check('confirm: paid_at terisi', (pg_temp.order_of('orderA')).paid_at is not null);
select pg_temp.eq('confirm: stok fisik berkurang', pg_temp.qty(), 1);
select pg_temp.eq('confirm: reservasi confirmed', (select status::text from public.stock_reservations
  where order_id = pg_temp.ctx('orderA')), 'confirmed');
select pg_temp.eq('confirm: stok tersedia = 1', pg_temp.avail(), 1);

set local role service_role;
select public.confirm_payment(pg_temp.ctx('orderA'));
reset role;
select pg_temp.eq('confirm: idempoten (stok tidak berkurang dua kali)', pg_temp.qty(), 1);

-- ------------------------------------------------------------
-- expire_pending_orders + bayar telat (stok masih ada)
-- ------------------------------------------------------------
select pg_temp.add_to_cart('00000000-0000-0000-0000-00000000000b', 1);
set local role service_role;
insert into _ctx
select 'orderB', (public.create_order(
  '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000b1', 'jne', 'reg', 25000
)).id;
reset role;
select pg_temp.eq('order B: stok tersedia habis', pg_temp.avail(), 0);

select pg_temp.expire('orderB');
set local role service_role;
select pg_temp.check('expire: job mengembalikan >= 1', public.expire_pending_orders() >= 1);
reset role;
select pg_temp.eq('expire: status expired', (pg_temp.order_of('orderB')).payment_status::text, 'expired');
select pg_temp.eq('expire: reservasi released', (select status::text from public.stock_reservations
  where order_id = pg_temp.ctx('orderB')), 'released');
select pg_temp.eq('expire: stok tersedia kembali', pg_temp.avail(), 1);
select pg_temp.eq('expire: tercatat di history', (select count(*) from public.order_status_history
  where order_id = pg_temp.ctx('orderB') and status_value = 'expired'), 1::bigint);

set local role service_role;
select public.confirm_payment(pg_temp.ctx('orderB'));
reset role;
select pg_temp.eq('bayar telat (stok ada): status paid', (pg_temp.order_of('orderB')).payment_status::text, 'paid');
select pg_temp.check('bayar telat (stok ada): tanpa attention', (pg_temp.order_of('orderB')).attention_reason is null);
select pg_temp.eq('bayar telat (stok ada): stok fisik berkurang', pg_temp.qty(), 0);

-- ------------------------------------------------------------
-- Bayar telat (stok habis)
-- ------------------------------------------------------------
select pg_temp.login('00000000-0000-0000-0000-0000000000ad');
set local role authenticated;
select pg_temp.eq('admin_adjust_stock: +1', public.admin_adjust_stock(pg_temp.ctx('v'), 1, 'Restock uji'), 1);
reset role;

select pg_temp.add_to_cart('00000000-0000-0000-0000-00000000000a', 1);
set local role service_role;
insert into _ctx
select 'orderC', (public.create_order(
  '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', 'jne', 'reg', 25000
)).id;
reset role;
select pg_temp.expire('orderC');
set local role service_role;
select public.expire_pending_orders();
reset role;
update public.product_variants set quantity = 0 where id = pg_temp.ctx('v'); -- dibeli orang lain

set local role service_role;
select public.confirm_payment(pg_temp.ctx('orderC'));
reset role;
select pg_temp.eq('bayar telat (stok habis): status paid', (pg_temp.order_of('orderC')).payment_status::text, 'paid');
select pg_temp.eq('bayar telat (stok habis): attention late_payment_out_of_stock',
  (pg_temp.order_of('orderC')).attention_reason::text, 'late_payment_out_of_stock');
select pg_temp.check('bayar telat (stok habis): tidak dikirim', (pg_temp.order_of('orderC')).shipping_status is null);
select pg_temp.eq('bayar telat (stok habis): stok tidak negatif', pg_temp.qty(), 0);

-- ------------------------------------------------------------
-- cancel_order
-- ------------------------------------------------------------
update public.product_variants set quantity = 2 where id = pg_temp.ctx('v');
select pg_temp.add_to_cart('00000000-0000-0000-0000-00000000000a', 1);
set local role service_role;
insert into _ctx
select 'orderD', (public.create_order(
  '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000a1', 'jne', 'reg', 25000
)).id;
insert into public.payments (order_id, gateway_order_id, amount, expires_at)
values (pg_temp.ctx('orderD'), 'uji-D-1', 12925000, now() + interval '1 hour');
select pg_temp.throws('payments: hanya satu attempt pending per order',
  $$ insert into public.payments (order_id, gateway_order_id, amount, expires_at)
     values (pg_temp.ctx('orderD'), 'uji-D-2', 12925000, now() + interval '1 hour') $$, '23505');
reset role;

select pg_temp.login('00000000-0000-0000-0000-00000000000b');
set local role authenticated;
select pg_temp.throws('cancel: customer lain tidak bisa membatalkan',
  $$ select public.cancel_order(pg_temp.ctx('orderD')) $$, 'P0001', 'order_not_cancellable');
select pg_temp.eq('customer B tidak melihat order A', (select count(*) from public.orders
  where profile_id = '00000000-0000-0000-0000-00000000000a'), 0::bigint);
reset role;

select pg_temp.login('00000000-0000-0000-0000-00000000000a');
set local role authenticated;
select pg_temp.lives('cancel: pemilik bisa membatalkan', $$ select public.cancel_order(pg_temp.ctx('orderD')) $$);
select pg_temp.throws('cancel: tidak bisa dibatalkan dua kali',
  $$ select public.cancel_order(pg_temp.ctx('orderD')) $$, 'P0001', 'order_not_cancellable');
select pg_temp.eq('customer A melihat ordernya sendiri', (select count(*) from public.orders), 3::bigint);
select pg_temp.eq('customer A membaca timeline ordernya', (select count(*) from public.order_status_history
  where order_id = pg_temp.ctx('orderD') and status_value = 'cancelled'), 1::bigint);
reset role;
select pg_temp.eq('cancel: status cancelled', (pg_temp.order_of('orderD')).payment_status::text, 'cancelled');
select pg_temp.eq('cancel: payment attempt dibatalkan', (select status::text from public.payments
  where gateway_order_id = 'uji-D-1'), 'cancel');
select pg_temp.eq('cancel: stok tersedia kembali', pg_temp.avail(), 2);

-- ------------------------------------------------------------
-- merge_guest_cart
-- ------------------------------------------------------------
select pg_temp.login('00000000-0000-0000-0000-00000000000b');
set local role authenticated;
delete from public.cart_items;
select pg_temp.eq('merge_guest_cart: cart DB kosong → cart guest dipindahkan',
  public.merge_guest_cart(format('[{"variant_id":"%s","quantity":5},{"variant_id":"%s","quantity":1}]',
                                 pg_temp.ctx('v'), gen_random_uuid())::jsonb),
  'adopted');
select pg_temp.eq('merge_guest_cart: dibatasi stok tersedia, varian tak dikenal diabaikan',
  (select sum(quantity) from public.cart_items), 2::bigint);
select pg_temp.eq('merge_guest_cart: cart DB berisi → cart DB dipertahankan',
  public.merge_guest_cart(format('[{"variant_id":"%s","quantity":1}]', pg_temp.ctx('v'))::jsonb),
  'kept');
select pg_temp.eq('merge_guest_cart: cart guest tidak ditambahkan saat kept',
  (select sum(quantity) from public.cart_items), 2::bigint);
select pg_temp.throws('merge_guest_cart: payload harus array',
  $$ select public.merge_guest_cart('{"a":1}') $$, '22023');
reset role;
