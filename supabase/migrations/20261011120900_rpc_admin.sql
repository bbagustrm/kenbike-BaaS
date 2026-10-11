-- #32 — RPC admin: produk + varian (atomik), stok, role.
-- Semua fungsi memeriksa private.is_admin() di dalam.

create function private.assert_admin()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
end;
$$;

-- ------------------------------------------------------------
-- Sinkronisasi opsi & varian sebuah produk dari payload:
-- {
--   "options":  [{ "name": "Warna", "values": ["Merah", "Biru"] }, ...],
--   "variants": [{ "id"?: uuid, "sku", "price", "weight_gram", "length_cm",
--                  "width_cm", "height_cm", "is_active"?, "initial_stock"?,
--                  "options": { "Warna": "Merah", ... } }, ...]
-- }
-- - Produk tanpa opsi: options = [] dan satu varian dengan options = {}.
-- - Varian lama yang tidak ada di payload: dihapus jika belum pernah dipesan,
--   selain itu dinonaktifkan.
-- - Stok varian lama tidak diubah di sini (pakai admin_adjust_stock).
-- ------------------------------------------------------------
create function private.sync_product_variants(p_product_id uuid, p jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_options jsonb := coalesce(p -> 'options', '[]'::jsonb);
  v_option_names text[];
  v_opt jsonb;
  v_opt_idx int;
  v_val text;
  v_val_idx int;
  v_option_id uuid;
  v_var jsonb;
  v_variant_id uuid;
  v_initial int;
  v_kept uuid[] := '{}';
  v_mapped int;
begin
  if jsonb_typeof(p -> 'variants') is distinct from 'array' or jsonb_array_length(p -> 'variants') = 0 then
    raise exception 'product_requires_variant' using errcode = '22023';
  end if;
  if jsonb_typeof(v_options) <> 'array' then
    raise exception 'options_must_be_array' using errcode = '22023';
  end if;

  v_option_names := array(select trim(e ->> 'name') from jsonb_array_elements(v_options) e);

  -- 1. Opsi yang dihapus (cascade ke nilai & mapping varian).
  delete from public.product_options
  where product_id = p_product_id and name <> all (v_option_names);

  -- 2. Upsert opsi & nilai.
  for v_opt, v_opt_idx in
    select e, i from jsonb_array_elements(v_options) with ordinality as t (e, i)
  loop
    insert into public.product_options (product_id, name, sort_order)
    values (p_product_id, trim(v_opt ->> 'name'), v_opt_idx)
    on conflict (product_id, name) do update set sort_order = excluded.sort_order
    returning id into v_option_id;

    if jsonb_typeof(v_opt -> 'values') is distinct from 'array' or jsonb_array_length(v_opt -> 'values') = 0 then
      raise exception 'option_requires_values' using errcode = '22023', detail = v_opt ->> 'name';
    end if;

    delete from public.product_option_values
    where option_id = v_option_id
      and value <> all (array(select trim(x) from jsonb_array_elements_text(v_opt -> 'values') x));

    for v_val, v_val_idx in
      select trim(x), i from jsonb_array_elements_text(v_opt -> 'values') with ordinality as t (x, i)
    loop
      insert into public.product_option_values (option_id, value, sort_order)
      values (v_option_id, v_val, v_val_idx)
      on conflict (option_id, value) do update set sort_order = excluded.sort_order;
    end loop;
  end loop;

  -- 3. Varian.
  for v_var in select e from jsonb_array_elements(p -> 'variants') e loop
    v_variant_id := nullif(v_var ->> 'id', '')::uuid;

    if v_variant_id is not null then
      update public.product_variants
      set sku = trim(v_var ->> 'sku'),
          price = (v_var ->> 'price')::bigint,
          weight_gram = (v_var ->> 'weight_gram')::int,
          length_cm = (v_var ->> 'length_cm')::int,
          width_cm = (v_var ->> 'width_cm')::int,
          height_cm = (v_var ->> 'height_cm')::int,
          is_active = coalesce((v_var ->> 'is_active')::boolean, true)
      where id = v_variant_id and product_id = p_product_id;
      if not found then
        raise exception 'variant_not_found' using errcode = 'P0002', detail = v_variant_id::text;
      end if;
    else
      v_initial := coalesce((v_var ->> 'initial_stock')::int, 0);
      if v_initial < 0 then
        raise exception 'invalid_initial_stock' using errcode = '22023', detail = v_var ->> 'sku';
      end if;

      insert into public.product_variants (
        product_id, sku, price, quantity, weight_gram, length_cm, width_cm, height_cm, is_active
      )
      values (
        p_product_id,
        trim(v_var ->> 'sku'),
        (v_var ->> 'price')::bigint,
        v_initial,
        (v_var ->> 'weight_gram')::int,
        (v_var ->> 'length_cm')::int,
        (v_var ->> 'width_cm')::int,
        (v_var ->> 'height_cm')::int,
        coalesce((v_var ->> 'is_active')::boolean, true)
      )
      returning id into v_variant_id;

      if v_initial > 0 then
        insert into public.stock_adjustments (variant_id, delta, quantity_after, reason, admin_id)
        values (v_variant_id, v_initial, v_initial, 'Stok awal', auth.uid());
      end if;
    end if;

    v_kept := v_kept || v_variant_id;

    -- Mapping opsi: setiap varian wajib punya tepat satu nilai untuk setiap opsi.
    if jsonb_typeof(coalesce(v_var -> 'options', '{}'::jsonb)) <> 'object'
       or (select count(*) from jsonb_object_keys(coalesce(v_var -> 'options', '{}'::jsonb))) <> cardinality(v_option_names)
    then
      raise exception 'variant_options_mismatch' using errcode = '22023', detail = v_var ->> 'sku';
    end if;

    delete from public.product_variant_options where variant_id = v_variant_id;

    insert into public.product_variant_options (variant_id, option_value_id)
    select v_variant_id, ov.id
    from jsonb_each_text(coalesce(v_var -> 'options', '{}'::jsonb)) kv
    join public.product_options po on po.product_id = p_product_id and po.name = trim(kv.key)
    join public.product_option_values ov on ov.option_id = po.id and ov.value = trim(kv.value);

    get diagnostics v_mapped = row_count;
    if v_mapped <> cardinality(v_option_names) then
      raise exception 'variant_options_mismatch' using errcode = '22023', detail = v_var ->> 'sku';
    end if;
  end loop;

  -- 4. Varian lama yang tidak ada di payload.
  update public.product_variants v
  set is_active = false
  where v.product_id = p_product_id
    and v.id <> all (v_kept)
    and (
      exists (select 1 from public.order_items oi where oi.variant_id = v.id)
      or exists (select 1 from public.stock_reservations r where r.variant_id = v.id)
    );

  delete from public.product_variants v
  where v.product_id = p_product_id
    and v.id <> all (v_kept)
    and not exists (select 1 from public.order_items oi where oi.variant_id = v.id)
    and not exists (select 1 from public.stock_reservations r where r.variant_id = v.id);

  -- 5. Tidak boleh ada dua varian aktif dengan kombinasi opsi yang sama.
  if exists (
    select 1
    from (
      select string_agg(pvo.option_value_id::text, ',' order by pvo.option_value_id) as combo
      from public.product_variants v
      left join public.product_variant_options pvo on pvo.variant_id = v.id
      where v.product_id = p_product_id and v.is_active
      group by v.id
    ) c
    group by c.combo
    having count(*) > 1
  ) then
    raise exception 'duplicate_variant_combination' using errcode = '23505';
  end if;
end;
$$;

-- ------------------------------------------------------------
-- admin_create_product(payload) → product id
-- payload: { category_id, name, slug, description?, is_active?, options, variants }
-- ------------------------------------------------------------
create function public.admin_create_product(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product_id uuid;
begin
  perform private.assert_admin();

  insert into public.products (category_id, name, slug, description, is_active)
  values (
    (payload ->> 'category_id')::uuid,
    trim(payload ->> 'name'),
    trim(payload ->> 'slug'),
    payload ->> 'description',
    coalesce((payload ->> 'is_active')::boolean, true)
  )
  returning id into v_product_id;

  perform private.sync_product_variants(v_product_id, payload);
  return v_product_id;
end;
$$;

revoke execute on function public.admin_create_product(jsonb) from public, anon;
grant execute on function public.admin_create_product(jsonb) to authenticated, service_role;

-- ------------------------------------------------------------

create function public.admin_update_product(p_product_id uuid, payload jsonb)
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
      is_active = coalesce((payload ->> 'is_active')::boolean, true)
  where id = p_product_id;
  if not found then
    raise exception 'product_not_found' using errcode = 'P0002';
  end if;

  perform private.sync_product_variants(p_product_id, payload);
end;
$$;

revoke execute on function public.admin_update_product(uuid, jsonb) from public, anon;
grant execute on function public.admin_update_product(uuid, jsonb) to authenticated, service_role;

-- ------------------------------------------------------------
-- Stok fisik: satu-satunya jalur baca/ubah untuk admin.
-- ------------------------------------------------------------
create function public.admin_get_stock(variant_ids uuid[])
returns table (variant_id uuid, quantity int, reserved int, available int)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.assert_admin();

  return query
  select v.id,
         v.quantity,
         coalesce((
           select sum(r.quantity)::int
           from public.stock_reservations r
           where r.variant_id = v.id and r.status = 'reserved' and r.expires_at > now()
         ), 0),
         private.variant_available_qty(v.id)
  from public.product_variants v
  where v.id = any (variant_ids);
end;
$$;

revoke execute on function public.admin_get_stock(uuid[]) from public, anon;
grant execute on function public.admin_get_stock(uuid[]) to authenticated, service_role;

create function public.admin_adjust_stock(p_variant_id uuid, p_delta int, p_reason text)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_quantity int;
begin
  perform private.assert_admin();

  if p_delta is null or p_delta = 0 then
    raise exception 'invalid_delta' using errcode = '22023';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'reason_required' using errcode = '22023';
  end if;

  update public.product_variants
  set quantity = quantity + p_delta
  where id = p_variant_id
  returning quantity into v_quantity;
  -- quantity < 0 ditolak oleh CHECK constraint (23514).

  if not found then
    raise exception 'variant_not_found' using errcode = 'P0002';
  end if;

  insert into public.stock_adjustments (variant_id, delta, quantity_after, reason, admin_id)
  values (p_variant_id, p_delta, v_quantity, trim(p_reason), auth.uid());

  return v_quantity;
end;
$$;

revoke execute on function public.admin_adjust_stock(uuid, int, text) from public, anon;
grant execute on function public.admin_adjust_stock(uuid, int, text) to authenticated, service_role;

-- ------------------------------------------------------------
-- Role: satu-satunya jalur mengubah profiles.role.
-- ------------------------------------------------------------
create function public.admin_set_role(p_user_id uuid, p_role public.user_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.assert_admin();

  -- Kunci semua admin agar dua penurunan bersamaan tidak menghabiskan admin.
  perform 1 from public.profiles where role = 'admin' for update;

  if p_role <> 'admin'
     and exists (select 1 from public.profiles where id = p_user_id and role = 'admin')
     and (select count(*) from public.profiles where role = 'admin') <= 1
  then
    raise exception 'last_admin' using errcode = 'P0001';
  end if;

  update public.profiles set role = p_role where id = p_user_id;
  if not found then
    raise exception 'user_not_found' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function public.admin_set_role(uuid, public.user_role) from public, anon;
grant execute on function public.admin_set_role(uuid, public.user_role) to authenticated, service_role;
