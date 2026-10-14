-- #78 — Info kontak toko untuk halaman publik, dibaca dengan kunci anon.
-- store_settings tetap admin-only; fungsi ini hanya membuka kolom kontak publik
-- (tanpa biteship_area_id, koordinat, dsb.) sehingga build/prerender tidak
-- membutuhkan service role key.

create function public.public_store_info()
returns table (
  store_name text,
  phone text,
  email text,
  address_line text,
  city text,
  province text,
  postal_code text
)
language sql
stable
security definer
set search_path = ''
as $$
  select s.store_name, s.phone, s.email, s.address_line, s.city, s.province, s.postal_code::text
  from public.store_settings s
  where s.is_active
  limit 1;
$$;

revoke execute on function public.public_store_info() from public;
grant execute on function public.public_store_info() to anon, authenticated, service_role;
