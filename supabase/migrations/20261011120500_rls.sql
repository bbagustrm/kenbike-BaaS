-- #28 — Row Level Security & grants.
-- Spesifikasi: docs/RLS-POLICIES.md. Prinsip: default deny — setiap tabel
-- RLS aktif, semua hak dicabut, lalu dibuka seminimal mungkin.

-- Di schema private agar tidak terekspos sebagai /rest/v1/rpc/is_admin.
-- anon & authenticated butuh USAGE + EXECUTE karena policy publik katalog
-- memanggilnya untuk semua pengunjung.
grant usage on schema private to anon, authenticated, service_role;

create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select role = 'admin' from public.profiles where id = (select auth.uid())),
    false
  )
$$;

revoke execute on function private.is_admin() from public;
grant execute on function private.is_admin() to anon, authenticated, service_role;

-- Fungsi event trigger milik fitur auto-RLS Supabase; tidak boleh dipanggil via REST.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end;
$$;

-- ------------------------------------------------------------
-- Reset hak: RLS aktif + cabut semua hak anon/authenticated di setiap tabel.
-- ------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'addresses', 'store_settings',
    'categories', 'products', 'product_options', 'product_option_values',
    'product_variants', 'product_variant_options', 'product_images', 'stock_adjustments',
    'carts', 'cart_items',
    'orders', 'order_items', 'payments', 'stock_reservations',
    'order_status_history', 'order_internal_notes', 'shipments'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon, authenticated', t);
    execute format('grant all on table public.%I to service_role', t);
  end loop;
end;
$$;

-- Konvensi: tepat satu policy per (role, aksi) agar Postgres tidak
-- mengevaluasi beberapa policy permissive per baris. "Milik sendiri ATAU admin"
-- digabung dalam satu ekspresi.

-- ============================================================
-- profiles
-- ============================================================
grant select on public.profiles to authenticated;
-- Role sengaja tidak termasuk: perubahan role hanya via admin_set_role().
grant update (full_name, phone, avatar_url) on public.profiles to authenticated;

create policy profiles_select on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()));

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ============================================================
-- addresses: pemilik penuh, admin hanya membaca
-- ============================================================
grant select, insert, update, delete on public.addresses to authenticated;

create policy addresses_select on public.addresses
  for select to authenticated
  using (profile_id = (select auth.uid()) or (select private.is_admin()));

create policy addresses_insert_own on public.addresses
  for insert to authenticated
  with check (profile_id = (select auth.uid()));

create policy addresses_update_own on public.addresses
  for update to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

create policy addresses_delete_own on public.addresses
  for delete to authenticated
  using (profile_id = (select auth.uid()));

-- ============================================================
-- store_settings (admin saja; server membaca via service role)
-- ============================================================
grant select, insert, update, delete on public.store_settings to authenticated;

create policy store_settings_admin_all on public.store_settings
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- ============================================================
-- Katalog: publik membaca (produk aktif), admin menulis.
-- ============================================================
grant select on public.categories, public.products, public.product_options,
  public.product_option_values, public.product_variant_options, public.product_images
  to anon, authenticated;
grant insert, update, delete on public.categories, public.products, public.product_options,
  public.product_option_values, public.product_images
  to authenticated;
grant insert, delete on public.product_variant_options to authenticated;

-- product_variants: kolom quantity tidak dibuka sama sekali untuk anon/authenticated.
grant select (id, product_id, sku, price, weight_gram, length_cm, width_cm, height_cm,
              is_active, created_at, updated_at)
  on public.product_variants to anon, authenticated;
grant insert (product_id, sku, price, weight_gram, length_cm, width_cm, height_cm, is_active),
      update (sku, price, weight_gram, length_cm, width_cm, height_cm, is_active),
      delete
  on public.product_variants to authenticated;

create policy categories_select on public.categories
  for select to anon, authenticated
  using (true);

create policy products_select on public.products
  for select to anon, authenticated
  using (is_active or (select private.is_admin()));

create policy product_options_select on public.product_options
  for select to anon, authenticated
  using (
    exists (select 1 from public.products p where p.id = product_id and p.is_active)
    or (select private.is_admin())
  );

create policy product_option_values_select on public.product_option_values
  for select to anon, authenticated
  using (
    exists (
      select 1
      from public.product_options o
      join public.products p on p.id = o.product_id
      where o.id = option_id and p.is_active
    )
    or (select private.is_admin())
  );

create policy product_variants_select on public.product_variants
  for select to anon, authenticated
  using (
    (is_active and exists (select 1 from public.products p where p.id = product_id and p.is_active))
    or (select private.is_admin())
  );

create policy product_variant_options_select on public.product_variant_options
  for select to anon, authenticated
  using (
    exists (
      select 1
      from public.product_variants v
      join public.products p on p.id = v.product_id
      where v.id = variant_id and v.is_active and p.is_active
    )
    or (select private.is_admin())
  );

create policy product_images_select on public.product_images
  for select to anon, authenticated
  using (
    exists (select 1 from public.products p where p.id = product_id and p.is_active)
    or (select private.is_admin())
  );

-- Policy tulis admin per aksi (insert/update/delete) untuk setiap tabel katalog.
do $$
declare
  t text;
begin
  foreach t in array array[
    'categories', 'products', 'product_options', 'product_option_values',
    'product_variants', 'product_variant_options', 'product_images'
  ] loop
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select private.is_admin()))',
      t || '_admin_insert', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()))',
      t || '_admin_update', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select private.is_admin()))',
      t || '_admin_delete', t);
  end loop;
end;
$$;

-- stock_adjustments (audit; ditulis lewat RPC admin)
grant select on public.stock_adjustments to authenticated;

create policy stock_adjustments_select_admin on public.stock_adjustments
  for select to authenticated
  using ((select private.is_admin()));

-- ============================================================
-- carts & cart_items
-- ============================================================
grant select on public.carts to authenticated;

create policy carts_select_own on public.carts
  for select to authenticated
  using (profile_id = (select auth.uid()));

grant select, insert, delete on public.cart_items to authenticated;
grant update (quantity) on public.cart_items to authenticated;

create policy cart_items_own_all on public.cart_items
  for all to authenticated
  using (exists (
    select 1 from public.carts c where c.id = cart_id and c.profile_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.carts c where c.id = cart_id and c.profile_id = (select auth.uid())
  ));

-- ============================================================
-- Order & transaksi: customer membaca miliknya, admin membaca semua.
-- Penulisan hanya via RPC / service role.
-- ============================================================
grant select on public.orders to authenticated;

create policy orders_select on public.orders
  for select to authenticated
  using (profile_id = (select auth.uid()) or (select private.is_admin()));

grant select on public.order_items to authenticated;

create policy order_items_select on public.order_items
  for select to authenticated
  using (
    exists (select 1 from public.orders o where o.id = order_id and o.profile_id = (select auth.uid()))
    or (select private.is_admin())
  );

-- payments: raw_response tidak dibuka (admin membacanya dari server via service role).
grant select (id, order_id, gateway, gateway_order_id, gateway_transaction_id, snap_token,
              payment_type, payment_channel, amount, status, expires_at, created_at, updated_at)
  on public.payments to authenticated;

create policy payments_select on public.payments
  for select to authenticated
  using (
    exists (select 1 from public.orders o where o.id = order_id and o.profile_id = (select auth.uid()))
    or (select private.is_admin())
  );

grant select on public.stock_reservations to authenticated;

create policy stock_reservations_select_admin on public.stock_reservations
  for select to authenticated
  using ((select private.is_admin()));

-- order_status_history: raw_payload tidak dibuka (admin membacanya via service role).
grant select (id, order_id, status_type, status_value, source, created_at)
  on public.order_status_history to authenticated;

create policy order_status_history_select on public.order_status_history
  for select to authenticated
  using (
    exists (select 1 from public.orders o where o.id = order_id and o.profile_id = (select auth.uid()))
    or (select private.is_admin())
  );

-- order_internal_notes: admin saja, tanpa update/delete (audit trail)
grant select, insert on public.order_internal_notes to authenticated;

create policy order_internal_notes_select_admin on public.order_internal_notes
  for select to authenticated
  using ((select private.is_admin()));

create policy order_internal_notes_insert_admin on public.order_internal_notes
  for insert to authenticated
  with check ((select private.is_admin()) and admin_id = (select auth.uid()));

-- shipments
grant select on public.shipments to authenticated;
grant update (waybill_id, estimated_delivery_date, actual_delivery_date) on public.shipments to authenticated;

create policy shipments_select on public.shipments
  for select to authenticated
  using (
    exists (select 1 from public.orders o where o.id = order_id and o.profile_id = (select auth.uid()))
    or (select private.is_admin())
  );

create policy shipments_update_admin on public.shipments
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));
