-- Pre-order per produk. Stok, pembayaran, dan reservasi sama dengan produk
-- biasa; yang berbeda hanya estimasi pengiriman yang lebih lama, ditampilkan ke
-- pembeli dan disnapshot ke order_items untuk halaman pesanan & admin.

alter table public.products
  add column is_preorder boolean not null default false,
  add column preorder_days int check (preorder_days between 1 and 365),
  add constraint products_preorder_days_required check (not is_preorder or preorder_days is not null);

comment on column public.products.preorder_days is
  'Estimasi barang siap dikirim (hari) untuk produk pre-order.';

alter table public.order_items
  add column preorder_days_snapshot int check (preorder_days_snapshot between 1 and 365);

-- Kolom baru di akhir: create or replace view mempertahankan grant.
create or replace view public.product_listings
with (security_invoker = true)
as
select
  p.id,
  p.slug,
  p.name,
  p.category_id,
  p.created_at,
  min(v.price) as price_min,
  max(v.price) as price_max,
  (
    select pi.storage_path
    from public.product_images pi
    where pi.product_id = p.id
    order by (pi.variant_id is not null), pi.sort_order, pi.created_at
    limit 1
  ) as image_path,
  p.is_preorder,
  p.preorder_days
from public.products p
join public.product_variants v on v.product_id = p.id and v.is_active
where p.is_active
group by p.id;

-- ------------------------------------------------------------
-- RPC: simpan & snapshot field pre-order (grant tetap dari migrasi awal).
-- ------------------------------------------------------------
create or replace function public.admin_create_product(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product_id uuid;
begin
  perform private.assert_admin();

  insert into public.products (category_id, name, slug, description, is_active, is_preorder, preorder_days)
  values (
    (payload ->> 'category_id')::uuid,
    trim(payload ->> 'name'),
    trim(payload ->> 'slug'),
    payload ->> 'description',
    coalesce((payload ->> 'is_active')::boolean, true),
    coalesce((payload ->> 'is_preorder')::boolean, false),
    (payload ->> 'preorder_days')::int
  )
  returning id into v_product_id;

  perform private.sync_product_variants(v_product_id, payload);
  return v_product_id;
end;
$$;

create or replace function public.admin_update_product(p_product_id uuid, payload jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.assert_admin();

  update public.products
  set category_id = (payload ->> 'category_id')::uuid,
      name = trim(payload ->> 'name'),
      slug = trim(payload ->> 'slug'),
      description = payload ->> 'description',
      is_active = coalesce((payload ->> 'is_active')::boolean, true),
      is_preorder = coalesce((payload ->> 'is_preorder')::boolean, false),
      preorder_days = (payload ->> 'preorder_days')::int
  where id = p_product_id;
  if not found then
    raise exception 'product_not_found' using errcode = 'P0002';
  end if;

  perform private.sync_product_variants(p_product_id, payload);
end;
$$;

create or replace function public.create_order(
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
    product_name_snapshot, variant_label_snapshot, image_url_snapshot, preorder_days_snapshot
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
    ),
    case when p.is_preorder then p.preorder_days end
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
