-- #29 — Bucket gambar produk. Publik dibaca (URL publik / CDN), tulis hanya admin.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5 * 1024 * 1024,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy product_images_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and (select private.is_admin()));

create policy product_images_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and (select private.is_admin()))
  with check (bucket_id = 'product-images' and (select private.is_admin()));

create policy product_images_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and (select private.is_admin()));

-- Upload/upsert butuh SELECT pada objek miliknya; batasi ke admin juga.
create policy product_images_admin_select on storage.objects
  for select to authenticated
  using (bucket_id = 'product-images' and (select private.is_admin()));
