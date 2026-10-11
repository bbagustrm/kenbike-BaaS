# KenBike — RLS Policies (Supabase)

> Pelengkap [ERD-ecommerce.dbml](ERD-ecommerce.dbml) dan [PRD.md](PRD.md). Semua tabel di schema `public` **wajib** `ENABLE ROW LEVEL SECURITY` — tabel tanpa policy = tidak bisa diakses role `anon`/`authenticated`.
> Role aplikasi: **`customer`** dan **`admin`** saja.
> Ini spesifikasi; SQL final ditulis ke `supabase/migrations/` saat implementasi.

---

## 1. Prinsip

1. **Default deny.** Aktifkan RLS di semua tabel, buka akses seminimal mungkin.
2. **RPC juga API publik.** Setiap fungsi di schema `public` bisa dipanggil langsung dari browser via PostgREST (`/rest/v1/rpc/<nama>`) memakai anon key + JWT user. Karena itu:
   - Fungsi yang menerima angka uang, `profile_id`, atau mengubah stok/status → **hanya `service_role`** (`revoke execute ... from public, anon, authenticated`).
   - Postgres memberi `EXECUTE` ke `PUBLIC` secara default untuk fungsi baru — **selalu revoke eksplisit**.
3. **Operasi sensitif tidak lewat tabel langsung.** Customer tidak punya policy `INSERT/UPDATE` ke `orders`, `order_items`, `payments`, `stock_reservations`, `shipments`, `order_status_history`.
4. **Webhook, job, & checkout memakai `service_role`** lewat `lib/supabase/admin.ts` (`import "server-only"`), dan **hanya setelah** Server Action memverifikasi user (`getUser()`) dan input.
5. **Role tidak boleh diubah user sendiri** — dijaga dengan column-level grant.
6. **Jangan percaya `user_metadata`** (bisa diubah user, termasuk data dari Google) untuk otorisasi. Role dibaca dari `profiles.role`.
7. `proxy.ts` hanya optimistic redirect; otorisasi sebenarnya di Server Action + RLS.

---

## 2. Helper Function

```sql
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select role = 'admin' from public.profiles where id = (select auth.uid())),
    false
  )
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
```

> `security definer` menghindari rekursi RLS saat policy `profiles` memanggil `is_admin()`.
> Gunakan `(select auth.uid())` / `(select public.is_admin())` di policy agar dievaluasi sekali per query.

---

## 3. Matriks Akses

`R` = SELECT, `W` = INSERT/UPDATE/DELETE, `—` = tidak ada akses langsung, `own` = baris milik `auth.uid()`, `SR` = hanya service role (server).

| Tabel                                      | anon                            | customer                      | admin                  | Penulis lain                           |
| ------------------------------------------ | ------------------------------- | ----------------------------- | ---------------------- | -------------------------------------- |
| profiles                                   | —                               | R own, U own (kolom terbatas) | R semua                | trigger (insert), RPC `admin_set_role` |
| addresses                                  | —                               | R/W own                       | R                      |                                        |
| store_settings                             | —                               | —                             | R/W                    | dibaca SR untuk Biteship               |
| categories                                 | R                               | R                             | R/W                    |                                        |
| products                                   | R (aktif)                       | R (aktif)                     | R/W                    |                                        |
| product_options / values / variant_options | R                               | R                             | R/W                    |                                        |
| product_variants                           | R (aktif, **tanpa `quantity`**) | sama                          | R/W (tanpa `quantity`) | stok via RPC                           |
| product_images                             | R                               | R                             | R/W                    |                                        |
| carts / cart_items                         | —                               | R/W own                       | —                      | `create_order` (kosongkan)             |
| orders                                     | —                               | R own                         | R                      | SR                                     |
| order_items                                | —                               | R own                         | R                      | SR                                     |
| payments                                   | —                               | R own (via view)              | R                      | SR                                     |
| stock_reservations                         | —                               | —                             | R                      | SR / pg_cron                           |
| order_status_history                       | —                               | R own (via view)              | R                      | SR                                     |
| order_internal_notes                       | —                               | —                             | R + insert             |                                        |
| shipments                                  | —                               | R own                         | R/U                    | SR (insert)                            |

---

## 4. Policy per Tabel

### profiles

```sql
alter table public.profiles enable row level security;

create policy "profiles_select_own_or_admin" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Batasi kolom yang bisa di-UPDATE oleh siapa pun yang login (termasuk admin via app):
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (full_name, phone, avatar_url) on public.profiles to authenticated;
```

- **INSERT:** tidak ada grant/policy → hanya trigger `handle_new_user()` (security definer) pada `auth.users`.
- **Ubah role:** hanya RPC `admin_set_role(user_id, role)` (security definer, cek `is_admin()` di dalam fungsi, tolak menurunkan diri sendiri bila dia admin terakhir).
- **Admin pertama:** manual via SQL Editor Supabase (lihat PRD §3.1).

### addresses

```sql
alter table public.addresses enable row level security;

create policy "addresses_own_all" on public.addresses
  for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

create policy "addresses_admin_select" on public.addresses
  for select to authenticated using ((select public.is_admin()));
```

### store_settings

```sql
alter table public.store_settings enable row level security;

create policy "store_settings_admin_all" on public.store_settings
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
```

### Katalog: categories, products, product_options, product_option_values, product_variant_options, product_images

Pola: publik membaca, admin menulis.

```sql
alter table public.categories enable row level security;
create policy "categories_public_read" on public.categories
  for select to anon, authenticated using (true);
create policy "categories_admin_write" on public.categories
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

alter table public.products enable row level security;
create policy "products_public_read" on public.products
  for select to anon, authenticated
  using (is_active or (select public.is_admin()));
create policy "products_admin_write" on public.products
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
```

`product_options`, `product_option_values`, `product_variant_options`, `product_images`: SELECT publik bila produk induk aktif (`exists (... p.is_active)`) atau admin; tulis hanya admin. Pembuatan produk baru tetap lewat RPC `admin_create_product` agar ≥ 1 varian terjamin.

### product_variants (stok disembunyikan)

```sql
alter table public.product_variants enable row level security;

create policy "variants_public_read" on public.product_variants
  for select to anon, authenticated
  using (
    (is_active and exists (select 1 from public.products p where p.id = product_id and p.is_active))
    or (select public.is_admin())
  );

create policy "variants_admin_write" on public.product_variants
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Kolom quantity tidak bisa dibaca maupun ditulis langsung oleh anon/authenticated (termasuk admin via app)
revoke select, insert, update on public.product_variants from anon, authenticated;
grant select (id, product_id, sku, price, weight_gram, length_cm, width_cm, height_cm,
              is_active, created_at, updated_at)
  on public.product_variants to anon, authenticated;
grant insert (product_id, sku, price, weight_gram, length_cm, width_cm, height_cm, is_active),
      update (sku, price, weight_gram, length_cm, width_cm, height_cm, is_active)
  on public.product_variants to authenticated;
```

- **Customer** membaca ketersediaan via `get_variant_availability(variant_ids uuid[])` → `(variant_id, available int)`, atau cukup `in_stock boolean` bila tak ingin angka pasti terlihat.
- **Admin** membaca stok fisik via `admin_get_stock(variant_ids)` dan mengubahnya **hanya** via `admin_adjust_stock(variant_id, delta, reason)` (semua perubahan stok tercatat).
- ⚠️ Konsekuensi: di app jangan pakai `select('*')` pada `product_variants` dan jangan `.update().select('*')` — sebutkan kolom secara eksplisit.

### carts & cart_items

```sql
alter table public.carts enable row level security;
create policy "carts_own_all" on public.carts
  for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

alter table public.cart_items enable row level security;
create policy "cart_items_own_all" on public.cart_items
  for all to authenticated
  using (exists (select 1 from public.carts c where c.id = cart_id and c.profile_id = (select auth.uid())))
  with check (exists (select 1 from public.carts c where c.id = cart_id and c.profile_id = (select auth.uid())));
```

Cart dibuat oleh trigger `handle_new_user()`. Validasi stok/varian aktif dilakukan saat checkout (cart boleh berisi item yang kemudian habis; UI menandainya).

### orders

```sql
alter table public.orders enable row level security;

create policy "orders_select_own" on public.orders
  for select to authenticated using (profile_id = (select auth.uid()));

create policy "orders_select_admin" on public.orders
  for select to authenticated using ((select public.is_admin()));
-- Tidak ada policy tulis. Create/update hanya via service role (create_order, webhook, RPC admin).
```

### order_items

```sql
alter table public.order_items enable row level security;

create policy "order_items_select_own" on public.order_items
  for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.profile_id = (select auth.uid())));

create policy "order_items_select_admin" on public.order_items
  for select to authenticated using ((select public.is_admin()));
```

### payments

```sql
alter table public.payments enable row level security;

create policy "payments_select_admin" on public.payments
  for select to authenticated using ((select public.is_admin()));
-- Customer TIDAK membaca tabel langsung (ada raw_response). Gunakan view:
create view public.my_payments with (security_invoker = false) as
  select p.id, p.order_id, p.payment_type, p.payment_channel, p.amount, p.status,
         p.snap_token, p.expires_at, p.created_at
  from public.payments p
  join public.orders o on o.id = p.order_id
  where o.profile_id = (select auth.uid());
revoke all on public.my_payments from anon;
grant select on public.my_payments to authenticated;
```

> `snap_token` dibutuhkan untuk membuka ulang popup Snap attempt yang masih pending.

### stock_reservations

```sql
alter table public.stock_reservations enable row level security;
create policy "stock_res_select_admin" on public.stock_reservations
  for select to authenticated using ((select public.is_admin()));
```

### order_status_history

```sql
alter table public.order_status_history enable row level security;
create policy "history_select_admin" on public.order_status_history
  for select to authenticated using ((select public.is_admin()));

-- Timeline customer tanpa raw_payload:
create view public.my_order_timeline with (security_invoker = false) as
  select h.id, h.order_id, h.status_type, h.status_value, h.created_at
  from public.order_status_history h
  join public.orders o on o.id = h.order_id
  where o.profile_id = (select auth.uid());
revoke all on public.my_order_timeline from anon;
grant select on public.my_order_timeline to authenticated;
```

### order_internal_notes

```sql
alter table public.order_internal_notes enable row level security;

create policy "notes_admin_select" on public.order_internal_notes
  for select to authenticated using ((select public.is_admin()));

create policy "notes_admin_insert" on public.order_internal_notes
  for insert to authenticated
  with check ((select public.is_admin()) and admin_id = (select auth.uid()));
-- Tidak ada update/delete (audit trail). Customer tidak punya akses.
```

### shipments

```sql
alter table public.shipments enable row level security;

create policy "shipments_select_own" on public.shipments
  for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.profile_id = (select auth.uid())));

create policy "shipments_select_admin" on public.shipments
  for select to authenticated using ((select public.is_admin()));

create policy "shipments_admin_update" on public.shipments
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
-- Insert: service role (setelah paid).
```

---

## 5. Supabase Storage

Bucket `product-images`:

- **public** (dibaca siapa saja).
- `storage.objects`: `INSERT/UPDATE/DELETE` hanya jika `bucket_id = 'product-images' and (select public.is_admin())`.
- Batasi MIME (`image/jpeg, image/png, image/webp`) & ukuran (mis. 5 MB) di konfigurasi bucket.

---

## 6. RPC

| RPC                                                                                      | Execute oleh                              | Fungsi                                                                                                                                              |
| ---------------------------------------------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `get_variant_availability(variant_ids uuid[])`                                           | anon, authenticated                       | Stok tersedia (fisik − reservasi aktif). Security definer, read-only.                                                                               |
| `get_or_create_cart()`                                                                   | authenticated                             | Pakai `auth.uid()` di dalam fungsi.                                                                                                                 |
| `merge_guest_cart(items jsonb)`                                                          | authenticated                             | Pakai `auth.uid()`; validasi varian aktif; quantity dibatasi wajar.                                                                                 |
| `cancel_order(order_id)`                                                                 | authenticated                             | Hanya pemilik & `pending_payment`; release reservasi. (Server Action juga membatalkan attempt Midtrans.)                                            |
| `admin_create_product(...)` / `admin_update_product(...)`                                | authenticated (cek `is_admin()` di dalam) | Produk + varian + opsi dalam 1 transaksi.                                                                                                           |
| `admin_get_stock(variant_ids)` / `admin_adjust_stock(variant_id, delta, reason)`         | authenticated (cek `is_admin()`)          | Satu-satunya jalur baca/ubah stok fisik.                                                                                                            |
| `admin_set_role(user_id, role)`                                                          | authenticated (cek `is_admin()`)          | Satu-satunya jalur mengubah role.                                                                                                                   |
| **`create_order(profile_id, address_id, courier_code, courier_service, shipping_cost)`** | **service_role saja**                     | Dipanggil Server Action setelah `getUser()` + hitung ulang ongkir Biteship. Harga dari DB, kunci `FOR UPDATE`, reservasi, snapshot, kosongkan cart. |
| `confirm_payment(order_id, ...)`                                                         | service_role                              | Reservasi → confirmed + kurangi stok; menangani kasus bayar-telat (reserve ulang / `attention_reason`).                                             |
| `release_reservations(order_id)`                                                         | service_role                              |                                                                                                                                                     |
| `expire_pending_orders()`                                                                | service_role (pg_cron)                    | Release reservasi kadaluarsa + set `expired`.                                                                                                       |

Template grant:

```sql
-- fungsi khusus server
revoke execute on function public.create_order(uuid, uuid, text, text, bigint) from public, anon, authenticated;
grant execute on function public.create_order(uuid, uuid, text, text, bigint) to service_role;

-- fungsi untuk user login (cek is_admin() di dalam bila fungsi admin)
revoke execute on function public.admin_set_role(uuid, public.user_role) from public, anon;
grant execute on function public.admin_set_role(uuid, public.user_role) to authenticated;
```

---

## 7. Checklist Verifikasi (sebelum rilis)

- [ ] Semua tabel `public` punya RLS aktif (`select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;` → kosong).
- [ ] Supabase Security Advisor bersih (perhatikan warning view `security_definer` — sudah disengaja untuk `my_*`, pastikan filter `auth.uid()` ada).
- [ ] Uji 3 identitas: anon, customer A (tidak bisa melihat order customer B), admin.
- [ ] Customer **tidak bisa**: `update profiles set role='admin'`, insert ke `orders`, memanggil `rpc('create_order')`, membaca `product_variants.quantity`, membaca `payments.raw_response`.
- [ ] Semua fungsi `public` sudah dicek grant `EXECUTE`-nya (`\df+` / `information_schema.routine_privileges`).
- [ ] `service_role` key hanya di env server, tidak berawalan `NEXT_PUBLIC_`.
