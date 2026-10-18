-- Hapus produk permanen (hard delete), satuan maupun massal.
-- Riwayat pesanan tetap utuh: order_items menyimpan snapshot nama/varian/harga/foto,
-- jadi tautan ke varian cukup dikosongkan. Produk yang masih ada di pesanan berjalan
-- (menunggu bayar, atau lunas & belum sampai) tidak boleh dihapus.

alter table public.order_items
  alter column variant_id drop not null,
  drop constraint order_items_variant_id_fkey,
  add constraint order_items_variant_id_fkey
    foreign key (variant_id) references public.product_variants (id) on delete set null;

alter table public.stock_reservations
  drop constraint stock_reservations_variant_id_fkey,
  add constraint stock_reservations_variant_id_fkey
    foreign key (variant_id) references public.product_variants (id) on delete cascade;

alter table public.product_variants
  drop constraint product_variants_product_id_fkey,
  add constraint product_variants_product_id_fkey
    foreign key (product_id) references public.products (id) on delete cascade;

-- Mengembalikan path Storage foto produk yang aman dihapus (tidak dipakai
-- sebagai snapshot foto di pesanan mana pun).
create function public.admin_delete_products(p_product_ids uuid[])
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ids uuid[];
  v_paths text[];
begin
  perform private.assert_admin();

  select coalesce(array_agg(distinct id), '{}') into v_ids
  from unnest(coalesce(p_product_ids, '{}')) as t(id);
  if cardinality(v_ids) = 0 or cardinality(v_ids) > 100 then
    raise exception 'invalid_product_ids' using errcode = '22023';
  end if;

  -- Kunci produk agar checkout bersamaan tidak lolos di antara cek & hapus.
  perform 1 from public.products where id = any (v_ids) for update;
  if not found then
    raise exception 'product_not_found' using errcode = 'P0002';
  end if;

  if exists (
    select 1
    from public.product_variants v
    join public.order_items oi on oi.variant_id = v.id
    join public.orders o on o.id = oi.order_id
    where v.product_id = any (v_ids)
      and (
        o.payment_status = 'pending_payment'
        or (o.payment_status = 'paid'
            and coalesce(o.shipping_status, 'pending') not in ('delivered', 'returned', 'cancelled'))
      )
  ) then
    raise exception 'product_in_active_order' using errcode = 'P0001';
  end if;

  select coalesce(array_agg(pi.storage_path), '{}') into v_paths
  from public.product_images pi
  where pi.product_id = any (v_ids)
    and not exists (
      select 1 from public.order_items oi where oi.image_url_snapshot = pi.storage_path
    );

  delete from public.products where id = any (v_ids);
  return v_paths;
end;
$$;

revoke execute on function public.admin_delete_products(uuid[]) from public, anon;
grant execute on function public.admin_delete_products(uuid[]) to authenticated;
