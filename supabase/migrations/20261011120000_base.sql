-- #23 — Fondasi: extensions, enums, schema private, fungsi utilitas.
-- Catatan project: "auto expose new tables" OFF, jadi setiap objek baru
-- tidak punya hak akses untuk anon/authenticated/service_role sampai di-GRANT.

create extension if not exists pg_trgm with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

-- Fungsi internal yang tidak boleh terekspos lewat Data API (PostgREST hanya
-- mengekspos schema public).
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
-- Fungsi di private tidak bisa dieksekusi siapa pun kecuali di-GRANT eksplisit.
alter default privileges in schema private revoke execute on functions from public;

-- ------------------------------------------------------------
-- Enums (nilai harus sama persis dengan docs/ERD-ecommerce.dbml)
-- ------------------------------------------------------------
create type public.user_role as enum ('customer', 'admin');

create type public.attention_reason as enum (
  'late_payment_out_of_stock',
  'shipment_create_failed',
  'amount_mismatch',
  'duplicate_payment'
);

create type public.payment_status as enum (
  'pending_payment', 'paid', 'expired', 'failed', 'cancelled', 'refunded'
);

create type public.shipping_status as enum (
  'pending', 'processing', 'shipped', 'delivered', 'returned', 'cancelled'
);

create type public.payment_attempt_status as enum (
  'pending', 'settlement', 'capture', 'deny', 'cancel', 'expire', 'failure', 'refund'
);

create type public.reservation_status as enum ('reserved', 'confirmed', 'released');

-- ------------------------------------------------------------
-- updated_at otomatis
-- ------------------------------------------------------------
create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ------------------------------------------------------------
-- Nomor order yang mudah dibaca: KB-YYYYMMDD-0001 (tanggal WIB)
-- ------------------------------------------------------------
create sequence private.order_number_seq;

create function private.generate_order_number()
returns text
language plpgsql
set search_path = ''
as $$
declare
  n bigint := nextval('private.order_number_seq');
begin
  -- greatest(): lpad memotong string yang lebih panjang dari target.
  return 'KB-'
    || to_char(now() at time zone 'Asia/Jakarta', 'YYYYMMDD')
    || '-'
    || lpad(n::text, greatest(4, length(n::text)), '0');
end;
$$;

grant execute on function private.generate_order_number() to service_role;

-- Hak default: fungsi baru di schema public tidak bisa dieksekusi siapa pun
-- kecuali di-GRANT eksplisit; service_role selalu mendapat akses ke objek baru.
alter default privileges in schema public revoke execute on functions from public;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;
