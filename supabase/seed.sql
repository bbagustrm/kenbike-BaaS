-- Seed data development KenBike. Dijalankan otomatis oleh `supabase db reset`.
-- Produk ditambahkan lewat pg_temp.seed_product(kategori, nama, slug, deskripsi, payload) — format payload sama dengan admin_create_product.

insert into public.categories (name, slug, parent_id, sort_order) values
  ('Sepeda', 'sepeda', null, 1),
  ('Sparepart', 'sparepart', null, 2),
  ('Aksesoris', 'aksesoris', null, 3);

insert into public.categories (name, slug, parent_id, sort_order)
select v.name, v.slug, c.id, v.sort_order
from (values ('MTB', 'mtb', 1), ('Road Bike', 'road', 2), ('Sepeda Lipat', 'lipat', 3)) as v (name, slug, sort_order)
cross join public.categories c
where c.slug = 'sepeda';

-- Data contoh: ganti lewat halaman admin "Pengaturan Toko" (#45) dengan area Biteship asli.
insert into public.store_settings (store_name, contact_name, phone, address_line, city, province, postal_code, biteship_area_id, note)
values ('KenBike', 'Admin KenBike', '081200000000', 'Jl. Contoh No. 1', 'Jakarta Selatan', 'DKI Jakarta', '12345', 'set-via-admin', 'Data contoh');

create function pg_temp.seed_product(p_category text, p_name text, p_slug text, p_description text, p jsonb)
returns void
language plpgsql
as $$
declare
  v_id uuid;
begin
  insert into public.products (category_id, name, slug, description)
  select id, p_name, p_slug, p_description from public.categories where slug = p_category
  returning id into v_id;
  perform private.sync_product_variants(v_id, p);
end;
$$;

select pg_temp.seed_product('mtb', 'Polygon Xtrada 5', 'polygon-xtrada-5', 'MTB hardtail 27.5" dengan groupset 2x9 speed dan rem cakram hidrolik.', '{"options": [{"name": "Warna", "values": ["Hitam", "Biru"]}, {"name": "Ukuran", "values": ["S", "M", "L"]}], "variants": [{"sku": "KB-PX5-HITA-S", "price": 7500000, "weight_gram": 15000, "length_cm": 140, "width_cm": 25, "height_cm": 75, "initial_stock": 3, "options": {"Warna": "Hitam", "Ukuran": "S"}}, {"sku": "KB-PX5-HITA-M", "price": 7500000, "weight_gram": 15000, "length_cm": 140, "width_cm": 25, "height_cm": 75, "initial_stock": 3, "options": {"Warna": "Hitam", "Ukuran": "M"}}, {"sku": "KB-PX5-HITA-L", "price": 7500000, "weight_gram": 15000, "length_cm": 140, "width_cm": 25, "height_cm": 75, "initial_stock": 3, "options": {"Warna": "Hitam", "Ukuran": "L"}}, {"sku": "KB-PX5-BIRU-S", "price": 7500000, "weight_gram": 15000, "length_cm": 140, "width_cm": 25, "height_cm": 75, "initial_stock": 3, "options": {"Warna": "Biru", "Ukuran": "S"}}, {"sku": "KB-PX5-BIRU-M", "price": 7500000, "weight_gram": 15000, "length_cm": 140, "width_cm": 25, "height_cm": 75, "initial_stock": 3, "options": {"Warna": "Biru", "Ukuran": "M"}}, {"sku": "KB-PX5-BIRU-L", "price": 7500000, "weight_gram": 15000, "length_cm": 140, "width_cm": 25, "height_cm": 75, "initial_stock": 3, "options": {"Warna": "Biru", "Ukuran": "L"}}]}'::jsonb);
select pg_temp.seed_product('mtb', 'United Detroit 1.0', 'united-detroit-1-0', 'MTB entry level 27.5" untuk gowes harian dan trail ringan.', '{"options": [{"name": "Ukuran", "values": ["M", "L"]}], "variants": [{"sku": "KB-UD10-M", "price": 3950000, "weight_gram": 14500, "length_cm": 140, "width_cm": 25, "height_cm": 75, "initial_stock": 4, "options": {"Ukuran": "M"}}, {"sku": "KB-UD10-L", "price": 3950000, "weight_gram": 14500, "length_cm": 140, "width_cm": 25, "height_cm": 75, "initial_stock": 4, "options": {"Ukuran": "L"}}]}'::jsonb);
select pg_temp.seed_product('road', 'Polygon Strattos S3', 'polygon-strattos-s3', 'Road bike aluminium dengan groupset Shimano Sora 2x9.', '{"options": [{"name": "Ukuran", "values": ["50", "52", "54"]}], "variants": [{"sku": "KB-PSS-50", "price": 12900000, "weight_gram": 12000, "length_cm": 140, "width_cm": 25, "height_cm": 75, "initial_stock": 2, "options": {"Ukuran": "50"}}, {"sku": "KB-PSS-52", "price": 12900000, "weight_gram": 12000, "length_cm": 140, "width_cm": 25, "height_cm": 75, "initial_stock": 2, "options": {"Ukuran": "52"}}, {"sku": "KB-PSS-54", "price": 12900000, "weight_gram": 12000, "length_cm": 140, "width_cm": 25, "height_cm": 75, "initial_stock": 2, "options": {"Ukuran": "54"}}]}'::jsonb);
select pg_temp.seed_product('lipat', 'Element Ecosmo 8', 'element-ecosmo-8', 'Sepeda lipat 20" 8 speed, ringan dan praktis dibawa.', '{"options": [{"name": "Warna", "values": ["Merah", "Putih"]}], "variants": [{"sku": "KB-EE8-MERA", "price": 4250000, "weight_gram": 13000, "length_cm": 85, "width_cm": 40, "height_cm": 70, "initial_stock": 5, "options": {"Warna": "Merah"}}, {"sku": "KB-EE8-PUTI", "price": 4250000, "weight_gram": 13000, "length_cm": 85, "width_cm": 40, "height_cm": 70, "initial_stock": 5, "options": {"Warna": "Putih"}}]}'::jsonb);
select pg_temp.seed_product('sparepart', 'Ban Maxxis Ardent', 'ban-maxxis-ardent', 'Ban MTB tubeless ready, grip kuat untuk trail.', '{"options": [{"name": "Ukuran", "values": ["27.5x2.25", "29x2.25"]}], "variants": [{"sku": "KB-BMA-275X", "price": 650000, "weight_gram": 900, "length_cm": 60, "width_cm": 60, "height_cm": 10, "initial_stock": 10, "options": {"Ukuran": "27.5x2.25"}}, {"sku": "KB-BMA-29X2", "price": 650000, "weight_gram": 900, "length_cm": 60, "width_cm": 60, "height_cm": 10, "initial_stock": 10, "options": {"Ukuran": "29x2.25"}}]}'::jsonb);
select pg_temp.seed_product('sparepart', 'Rantai Shimano CN-HG601 11 Speed', 'rantai-shimano-cn-hg601', 'Rantai 11 speed dengan quick link.', '{"options": [], "variants": [{"sku": "KB-RSCH", "price": 425000, "weight_gram": 300, "length_cm": 15, "width_cm": 10, "height_cm": 5, "initial_stock": 15, "options": {}}]}'::jsonb);
select pg_temp.seed_product('sparepart', 'Rem Cakram Shimano MT200 (Sepasang)', 'rem-cakram-shimano-mt200', 'Rem cakram hidrolik depan-belakang lengkap dengan rotor.', '{"options": [], "variants": [{"sku": "KB-RCSM", "price": 980000, "weight_gram": 1200, "length_cm": 35, "width_cm": 25, "height_cm": 10, "initial_stock": 6, "options": {}}]}'::jsonb);
select pg_temp.seed_product('aksesoris', 'Helm Kalibre Air', 'helm-kalibre-air', 'Helm ringan dengan ventilasi besar.', '{"options": [{"name": "Warna", "values": ["Hitam", "Putih"]}, {"name": "Ukuran", "values": ["M", "L"]}], "variants": [{"sku": "KB-HKA-HITA-M", "price": 450000, "weight_gram": 400, "length_cm": 30, "width_cm": 25, "height_cm": 20, "initial_stock": 4, "options": {"Warna": "Hitam", "Ukuran": "M"}}, {"sku": "KB-HKA-HITA-L", "price": 450000, "weight_gram": 400, "length_cm": 30, "width_cm": 25, "height_cm": 20, "initial_stock": 4, "options": {"Warna": "Hitam", "Ukuran": "L"}}, {"sku": "KB-HKA-PUTI-M", "price": 450000, "weight_gram": 400, "length_cm": 30, "width_cm": 25, "height_cm": 20, "initial_stock": 4, "options": {"Warna": "Putih", "Ukuran": "M"}}, {"sku": "KB-HKA-PUTI-L", "price": 450000, "weight_gram": 400, "length_cm": 30, "width_cm": 25, "height_cm": 20, "initial_stock": 4, "options": {"Warna": "Putih", "Ukuran": "L"}}]}'::jsonb);
select pg_temp.seed_product('aksesoris', 'Lampu Depan Rockbros USB', 'lampu-depan-rockbros-usb', 'Lampu depan 400 lumen, isi ulang via USB-C.', '{"options": [], "variants": [{"sku": "KB-LDRU", "price": 185000, "weight_gram": 200, "length_cm": 15, "width_cm": 8, "height_cm": 8, "initial_stock": 20, "options": {}}]}'::jsonb);
select pg_temp.seed_product('aksesoris', 'Botol Minum Polygon 750ml', 'botol-minum-polygon-750ml', 'Botol minum BPA free dengan tutup anti tumpah.', '{"options": [{"name": "Warna", "values": ["Hitam", "Biru"]}], "variants": [{"sku": "KB-BMP7-HITA", "price": 65000, "weight_gram": 150, "length_cm": 25, "width_cm": 8, "height_cm": 8, "initial_stock": 25, "options": {"Warna": "Hitam"}}, {"sku": "KB-BMP7-BIRU", "price": 65000, "weight_gram": 150, "length_cm": 25, "width_cm": 8, "height_cm": 8, "initial_stock": 25, "options": {"Warna": "Biru"}}]}'::jsonb);
select pg_temp.seed_product('aksesoris', 'Pompa Mini Giyo', 'pompa-mini-giyo', 'Pompa portabel presta & schrader.', '{"options": [], "variants": [{"sku": "KB-PMG", "price": 120000, "weight_gram": 180, "length_cm": 25, "width_cm": 6, "height_cm": 6, "initial_stock": 12, "options": {}}]}'::jsonb);
select pg_temp.seed_product('aksesoris', 'Sarung Tangan Fox Ranger', 'sarung-tangan-fox-ranger', 'Sarung tangan full finger untuk MTB.', '{"options": [{"name": "Ukuran", "values": ["M", "L", "XL"]}], "variants": [{"sku": "KB-STFR-M", "price": 350000, "weight_gram": 120, "length_cm": 20, "width_cm": 12, "height_cm": 3, "initial_stock": 6, "options": {"Ukuran": "M"}}, {"sku": "KB-STFR-L", "price": 350000, "weight_gram": 120, "length_cm": 20, "width_cm": 12, "height_cm": 3, "initial_stock": 6, "options": {"Ukuran": "L"}}, {"sku": "KB-STFR-XL", "price": 350000, "weight_gram": 120, "length_cm": 20, "width_cm": 12, "height_cm": 3, "initial_stock": 6, "options": {"Ukuran": "XL"}}]}'::jsonb);
