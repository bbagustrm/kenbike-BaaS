-- #69 — Link pelacakan Biteship untuk halaman detail order customer.
-- Diisi saat order Biteship dibuat (courier.link) dan diperbarui webhook (courier_link).
alter table public.shipments
  add column tracking_id varchar(100),
  add column tracking_url text check (tracking_url is null or tracking_url ~ '^https://');
