-- #53 — Aturan keranjang saat login berubah dari "gabungkan" menjadi "pakai salah satu":
--   * cart DB sudah berisi  → cart DB dipakai, cart guest (localStorage) dibuang;
--   * cart DB kosong        → isi cart guest dipindahkan ke DB.
-- Diputuskan di DB (dengan lock baris cart) agar login di dua tab sekaligus tidak
-- menggandakan item. Tipe kembalian berubah (void → text), jadi fungsi di-drop dulu.

drop function public.merge_guest_cart(jsonb);

-- items: [{ "variant_id": uuid, "quantity": int }, ...]
-- Varian nonaktif/habis diabaikan; quantity dibatasi stok tersedia & maks 10.
-- Kembalian: 'adopted' (cart guest dipindahkan) atau 'kept' (cart DB dipertahankan).
create function public.merge_guest_cart(items jsonb)
returns text
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

  -- Serialisasi sinkronisasi cart milik user yang sama.
  perform 1 from public.carts where id = v_cart_id for update;

  if exists (select 1 from public.cart_items where cart_id = v_cart_id) then
    return 'kept';
  end if;

  insert into public.cart_items (cart_id, variant_id, quantity)
  select v_cart_id, g.variant_id, least(g.quantity, 10, g.available)
  from (
    select x.variant_id, sum(x.quantity)::int as quantity,
           private.variant_available_qty(x.variant_id) as available
    from jsonb_to_recordset(items) as x (variant_id uuid, quantity int)
    where x.variant_id is not null and x.quantity > 0
    group by x.variant_id
  ) g
  where g.available > 0;

  return 'adopted';
end;
$$;

revoke execute on function public.merge_guest_cart(jsonb) from public;
grant execute on function public.merge_guest_cart(jsonb) to authenticated;
