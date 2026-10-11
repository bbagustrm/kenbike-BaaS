-- #41 — Ringkasan produk untuk daftar/kartu katalog: harga min/max varian
-- aktif dan gambar utama. security_invoker = true → RLS & column grants tabel
-- asal tetap berlaku untuk pemanggil (anon hanya melihat produk aktif).

create view public.product_listings
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
  ) as image_path
from public.products p
join public.product_variants v on v.product_id = p.id and v.is_active
where p.is_active
group by p.id;

comment on view public.product_listings is
  'Produk aktif yang punya minimal satu varian aktif, dengan rentang harga dan gambar utama.';

revoke all on public.product_listings from anon, authenticated;
grant select on public.product_listings to anon, authenticated, service_role;

-- Pengurutan & filter harga di daftar produk.
create index product_variants_active_price_idx
  on public.product_variants (product_id, price) where is_active;
