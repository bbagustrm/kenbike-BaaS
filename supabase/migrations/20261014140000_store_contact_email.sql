-- #78 — Email kontak toko untuk halaman Kontak & legal (publik, dibaca server lalu di-cache).
alter table public.store_settings
  add column email text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');
