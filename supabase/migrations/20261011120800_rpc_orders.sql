-- #31 — Transaksi inti: create_order, cancel_order, confirm_payment,
-- release_reservations, expire_pending_orders (+ pg_cron).
-- Model stok: docs/PRD.md §3.4. State machine: docs/PRD.md §3.5.
--
-- Konkurensi: setiap fungsi yang mengubah stok mengunci baris varian dengan
-- SELECT ... FOR UPDATE terurut id (menghindari deadlock), lalu menghitung
-- stok tersedia setelah kunci didapat.

-- ------------------------------------------------------------
-- create_order — HANYA service_role. Dipanggil Server Action setelah
-- getUser() + validasi ongkir Biteship; profile_id berasal dari session.
-- ------------------------------------------------------------
create function public.create_order(
  p_profile_id uuid,
  p_address_id uuid,
  p_courier_code text,
  p_courier_service text,
  p_shipping_cost bigint,
  p_customer_note text default null
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_address public.addresses;
  v_cart_id uuid;
  v_order public.orders;
  v_subtotal bigint := 0;
  v_expires_at timestamptz := now() + interval '24 hours';
  r record;
begin
  if p_shipping_cost is null or p_shipping_cost < 0 then
    raise exception 'invalid_shipping_cost' using errcode = '22023';
  end if;
  if coalesce(trim(p_courier_code), '') = '' or coalesce(trim(p_courier_service), '') = '' then
    raise exception 'invalid_courier' using errcode = '22023';
  end if;

  select * into v_address
  from public.addresses
  where id = p_address_id and profile_id = p_profile_id;
  if not found then
    raise exception 'address_not_found' using errcode = 'P0002';
  end if;

  select id into v_cart_id from public.carts where profile_id = p_profile_id;
  if v_cart_id is null or not exists (select 1 from public.cart_items where cart_id = v_cart_id) then
    raise exception 'cart_empty' using errcode = 'P0001';
  end if;

  perform 1
  from public.product_variants v
  where v.id in (select ci.variant_id from public.cart_items ci where ci.cart_id = v_cart_id)
  order by v.id
  for update;

  for r in
    select ci.quantity, v.sku, v.price,
           private.variant_available_qty(v.id) as available
    from public.cart_items ci
    join public.product_variants v on v.id = ci.variant_id
    where ci.cart_id = v_cart_id
  loop
    if r.available < r.quantity then
      raise exception 'insufficient_stock' using errcode = 'P0001', detail = r.sku;
    end if;
    v_subtotal := v_subtotal + r.price * r.quantity;
  end loop;

  insert into public.orders (
    profile_id, subtotal, shipping_cost, total_amount,
    courier_code, courier_service, shipping_address_snapshot, customer_note, expires_at
  )
  values (
    p_profile_id, v_subtotal, p_shipping_cost, v_subtotal + p_shipping_cost,
    trim(p_courier_code), trim(p_courier_service),
    jsonb_build_object(
      'recipient_name', v_address.recipient_name,
      'phone', v_address.phone,
      'address_line', v_address.address_line,
      'district', v_address.district,
      'city', v_address.city,
      'province', v_address.province,
      'postal_code', v_address.postal_code,
      'biteship_area_id', v_address.biteship_area_id,
      'latitude', v_address.latitude,
      'longitude', v_address.longitude,
      'note', v_address.note
    ),
    nullif(trim(p_customer_note), ''),
    v_expires_at
  )
  returning * into v_order;

  insert into public.order_items (
    order_id, variant_id, quantity, price_at_purchase, weight_gram_snapshot,
    product_name_snapshot, variant_label_snapshot, image_url_snapshot
  )
  select
    v_order.id, ci.variant_id, ci.quantity, v.price, v.weight_gram, p.name,
    (
      select string_agg(ov.value, ' - ' order by po.sort_order, po.name)
      from public.product_variant_options pvo
      join public.product_option_values ov on ov.id = pvo.option_value_id
      join public.product_options po on po.id = ov.option_id
      where pvo.variant_id = v.id
    ),
    (
      select pi.storage_path
      from public.product_images pi
      where pi.product_id = p.id and (pi.variant_id = v.id or pi.variant_id is null)
      order by (pi.variant_id is null), pi.sort_order
      limit 1
    )
  from public.cart_items ci
  join public.product_variants v on v.id = ci.variant_id
  join public.products p on p.id = v.product_id
  where ci.cart_id = v_cart_id;

  insert into public.stock_reservations (variant_id, order_id, quantity, expires_at)
  select ci.variant_id, v_order.id, ci.quantity, v_expires_at
  from public.cart_items ci
  where ci.cart_id = v_cart_id;

  delete from public.cart_items where cart_id = v_cart_id;

  insert into public.order_status_history (order_id, status_type, status_value, source, event_key)
  values (v_order.id, 'payment', 'pending_payment', 'system', 'order_created:' || v_order.id);

  return v_order;
end;
$$;

revoke execute on function public.create_order(uuid, uuid, text, text, bigint, text) from public, anon, authenticated;
grant execute on function public.create_order(uuid, uuid, text, text, bigint, text) to service_role;

-- ------------------------------------------------------------
-- release_reservations — service_role (dan dipakai fungsi lain).
-- ------------------------------------------------------------
create function public.release_reservations(p_order_id uuid)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  update public.stock_reservations
  set status = 'released'
  where order_id = p_order_id and status = 'reserved';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke execute on function public.release_reservations(uuid) from public, anon, authenticated;
grant execute on function public.release_reservations(uuid) to service_role;

-- ------------------------------------------------------------
-- cancel_order — customer pemilik order, hanya saat pending_payment.
-- Server Action membatalkan transaksi Midtrans lebih dulu, lalu memanggil ini.
-- ------------------------------------------------------------
create function public.cancel_order(p_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
begin
  update public.orders
  set payment_status = 'cancelled'
  where id = p_order_id
    and profile_id = (select auth.uid())
    and payment_status = 'pending_payment'
  returning * into v_order;

  if not found then
    raise exception 'order_not_cancellable' using errcode = 'P0001';
  end if;

  perform public.release_reservations(p_order_id);

  update public.payments set status = 'cancel'
  where order_id = p_order_id and status = 'pending';

  insert into public.order_status_history (order_id, status_type, status_value, source, event_key)
  values (p_order_id, 'payment', 'cancelled', 'system', 'cancelled:' || p_order_id)
  on conflict (source, event_key) do nothing;

  return v_order;
end;
$$;

revoke execute on function public.cancel_order(uuid) from public;
grant execute on function public.cancel_order(uuid) to authenticated, service_role;

-- ------------------------------------------------------------
-- confirm_payment — service_role (webhook Midtrans, settlement/capture).
-- Idempoten: order yang sudah paid dikembalikan apa adanya; deteksi
-- pembayaran dobel dilakukan pemanggil (bandingkan payment attempt).
-- ------------------------------------------------------------
create function public.confirm_payment(p_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_has_active boolean;
  v_short boolean;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;

  if v_order.payment_status = 'paid' then
    return v_order;
  end if;
  if v_order.payment_status not in ('pending_payment', 'expired', 'cancelled') then
    raise exception 'invalid_transition' using errcode = 'P0001',
      detail = v_order.payment_status::text || ' -> paid';
  end if;

  perform 1
  from public.product_variants v
  where v.id in (select oi.variant_id from public.order_items oi where oi.order_id = p_order_id)
  order by v.id
  for update;

  -- Reservasi masih dipegang (walau expires_at lewat, selama job belum melepasnya).
  select exists (
    select 1 from public.stock_reservations
    where order_id = p_order_id and status = 'reserved'
  ) into v_has_active;

  if v_has_active then
    update public.product_variants v
    set quantity = v.quantity - r.qty
    from (
      select variant_id, sum(quantity) as qty
      from public.stock_reservations
      where order_id = p_order_id and status = 'reserved'
      group by variant_id
    ) r
    where v.id = r.variant_id;

    update public.stock_reservations set status = 'confirmed'
    where order_id = p_order_id and status = 'reserved';

    update public.orders
    set payment_status = 'paid', paid_at = now(), shipping_status = 'pending'
    where id = p_order_id
    returning * into v_order;
    return v_order;
  end if;

  -- Bayar telat: reservasi sudah dilepas. Coba ambil stok lagi.
  select exists (
    select 1
    from (
      select variant_id, sum(quantity) as qty
      from public.order_items
      where order_id = p_order_id
      group by variant_id
    ) i
    where private.variant_available_qty(i.variant_id) < i.qty
  ) into v_short;

  if v_short then
    update public.orders
    set payment_status = 'paid', paid_at = now(), attention_reason = 'late_payment_out_of_stock'
    where id = p_order_id
    returning * into v_order;
    return v_order;
  end if;

  update public.product_variants v
  set quantity = v.quantity - i.qty
  from (
    select variant_id, sum(quantity) as qty
    from public.order_items
    where order_id = p_order_id
    group by variant_id
  ) i
  where v.id = i.variant_id;

  insert into public.stock_reservations (variant_id, order_id, quantity, status, expires_at)
  select variant_id, p_order_id, sum(quantity), 'confirmed', now()
  from public.order_items
  where order_id = p_order_id
  group by variant_id;

  update public.orders
  set payment_status = 'paid', paid_at = now(), shipping_status = 'pending'
  where id = p_order_id
  returning * into v_order;
  return v_order;
end;
$$;

revoke execute on function public.confirm_payment(uuid) from public, anon, authenticated;
grant execute on function public.confirm_payment(uuid) to service_role;

-- ------------------------------------------------------------
-- expire_pending_orders — pg_cron tiap menit (cadangan webhook expire).
-- ------------------------------------------------------------
create function public.expire_pending_orders()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count int;
begin
  with expired as (
    update public.orders
    set payment_status = 'expired'
    where payment_status = 'pending_payment' and expires_at < now()
    returning id
  ),
  released as (
    update public.stock_reservations r
    set status = 'released'
    from expired e
    where r.order_id = e.id and r.status = 'reserved'
  ),
  history as (
    insert into public.order_status_history (order_id, status_type, status_value, source, event_key)
    select id, 'payment', 'expired', 'system', 'expired:' || id
    from expired
    on conflict (source, event_key) do nothing
  )
  select count(*) into v_count from expired;

  -- Attempt Midtrans yang lewat batas tetapi webhook expire belum datang.
  update public.payments
  set status = 'expire'
  where status = 'pending' and expires_at < now();

  -- Pengaman: reservasi kadaluarsa milik order yang tidak lagi pending.
  update public.stock_reservations r
  set status = 'released'
  where r.status = 'reserved'
    and r.expires_at < now()
    and not exists (
      select 1 from public.orders o
      where o.id = r.order_id and o.payment_status = 'pending_payment'
    );

  return v_count;
end;
$$;

revoke execute on function public.expire_pending_orders() from public, anon, authenticated;
grant execute on function public.expire_pending_orders() to service_role;

select cron.schedule('expire-pending-orders', '* * * * *', 'select public.expire_pending_orders()');
