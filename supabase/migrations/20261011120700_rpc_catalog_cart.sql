-- #30 — RPC yang aman dipanggil langsung dari client: ketersediaan stok & cart.

-- Stok tersedia = stok fisik − reservasi aktif. Varian/produk nonaktif = 0.
-- Internal: dipakai juga oleh create_order & confirm_payment.
create function private.variant_available_qty(p_variant_id uuid)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when v.is_active and p.is_active then
      greatest(
        v.quantity - coalesce((
          select sum(r.quantity)
          from public.stock_reservations r
          where r.variant_id = v.id and r.status = 'reserved' and r.expires_at > now()
        ), 0),
        0
      )::int
    else 0
  end
  from public.product_variants v
  join public.products p on p.id = v.product_id
  where v.id = p_variant_id
$$;

-- ------------------------------------------------------------

create function public.get_variant_availability(variant_ids uuid[])
returns table (variant_id uuid, available int)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if cardinality(variant_ids) > 200 then
    raise exception 'too_many_variants' using errcode = '22023';
  end if;

  return query
  select v.id, private.variant_available_qty(v.id)
  from public.product_variants v
  where v.id = any (variant_ids);
end;
$$;

revoke execute on function public.get_variant_availability(uuid[]) from public;
grant execute on function public.get_variant_availability(uuid[]) to anon, authenticated, service_role;

-- ------------------------------------------------------------

create function public.get_or_create_cart()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_cart_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  insert into public.carts (profile_id) values (v_uid)
  on conflict (profile_id) do nothing;

  select id into v_cart_id from public.carts where profile_id = v_uid;
  return v_cart_id;
end;
$$;

revoke execute on function public.get_or_create_cart() from public;
grant execute on function public.get_or_create_cart() to authenticated;

-- ------------------------------------------------------------
-- Gabungkan guest cart (localStorage) ke cart DB setelah login.
-- items: [{ "variant_id": uuid, "quantity": int }, ...]
-- Varian nonaktif/habis diabaikan; quantity dibatasi stok tersedia & maks 10.
-- ------------------------------------------------------------
create function public.merge_guest_cart(items jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cart_id uuid := public.get_or_create_cart();
begin
  if jsonb_typeof(items) is distinct from 'array' then
    raise exception 'items_must_be_array' using errcode = '22023';
  end if;
  if jsonb_array_length(items) > 50 then
    raise exception 'too_many_items' using errcode = '22023';
  end if;

  insert into public.cart_items as ci (cart_id, variant_id, quantity)
  select v_cart_id, g.variant_id, least(g.quantity, 10, g.available)
  from (
    select x.variant_id, sum(x.quantity)::int as quantity,
           private.variant_available_qty(x.variant_id) as available
    from jsonb_to_recordset(items) as x (variant_id uuid, quantity int)
    where x.variant_id is not null and x.quantity > 0
    group by x.variant_id
  ) g
  where g.available > 0
  on conflict (cart_id, variant_id) do update
  set quantity = least(ci.quantity + excluded.quantity, 10);
end;
$$;

revoke execute on function public.merge_guest_cart(jsonb) from public;
grant execute on function public.merge_guest_cart(jsonb) to authenticated;
