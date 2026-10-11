# KenBike — RLS Policies (Supabase)

> Pelengkap [ERD-ecommerce.dbml](ERD-ecommerce.dbml) dan [PRD.md](PRD.md). Role aplikasi: **`customer`** dan **`admin`**.
>
> **Sumber kebenaran SQL** ada di `supabase/migrations/` — terutama `*_rls.sql`, `*_storage.sql`, dan `*_rpc_*.sql`. Dokumen ini menjelaskan prinsip, matriks akses, dan keputusan desain; jangan menyalin SQL ke sini agar tidak tidak-sinkron.
> Verifikasi otomatis: `bun run db:test` (118 assertion, lihat §7).

---

## 1. Prinsip

1. **Default deny.** Setiap tabel `public`: RLS aktif, `revoke all` dari `anon`/`authenticated`, lalu dibuka seminimal mungkin dengan `GRANT` + policy.
2. **Project tidak meng-expose tabel otomatis.** Dashboard: "Automatically expose new tables" **OFF**, sehingga objek baru tidak punya hak untuk `anon`, `authenticated`, **maupun `service_role`**. Setiap migrasi wajib memberi `GRANT` eksplisit (migrasi base memasang default privileges `service_role`). Event trigger auto-RLS (`ensure_rls`) **ON** sebagai jaring pengaman.
3. **RPC juga API publik.** Fungsi di schema `public` bisa dipanggil via `/rest/v1/rpc/<nama>`. Karena itu:
   - Default privileges mencabut `EXECUTE` dari `PUBLIC` untuk fungsi baru; setiap RPC diberi grant eksplisit.
   - Fungsi yang menerima angka uang / `profile_id` atau mengubah stok/status (`create_order`, `confirm_payment`, …) → **hanya `service_role`**.
   - Fungsi internal berada di schema **`private`** (tidak diekspos PostgREST).
4. **Satu policy per (role, aksi).** "Milik sendiri ATAU admin" digabung dalam satu ekspresi; policy tulis admin dipecah per insert/update/delete. Menghindari peringatan _multiple permissive policies_ dan evaluasi ganda per baris.
5. **Kolom sensitif disembunyikan dengan column grant**, bukan view:
   - `product_variants.quantity` — stok fisik.
   - `payments.raw_response`, `order_status_history.raw_payload` — data mentah gateway/kurir.
   - `profiles.role` — tidak termasuk kolom yang boleh di-`UPDATE`.

   Column grant berlaku untuk **semua** pengguna `authenticated`, termasuk admin. Admin membaca stok via `admin_get_stock()`, dan data mentah via server (service role) setelah `requireAdmin()`.
   ⚠️ Di app jangan pakai `select('*')` pada tabel-tabel ini — sebutkan kolom secara eksplisit.

6. **Webhook, job, dan checkout memakai `service_role`** lewat `lib/supabase/admin.ts` (`server-only`), hanya setelah Server Action memverifikasi user (`getUser()`) dan input.
7. **Jangan percaya `user_metadata`** untuk otorisasi. Role dibaca dari `profiles.role`.
8. Di policy gunakan `(select auth.uid())` / `(select private.is_admin())` agar dievaluasi sekali per query.

---

## 2. Helper

| Fungsi                                       | Schema    | Keterangan                                                                                                                                                                      |
| -------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `is_admin()`                                 | `private` | `security definer`. `anon` & `authenticated` diberi `USAGE` schema + `EXECUTE` karena policy katalog publik memanggilnya untuk semua pengunjung. Tidak bisa dipanggil via REST. |
| `assert_admin()`                             | `private` | Dipakai di awal setiap RPC admin; melempar `42501 forbidden`.                                                                                                                   |
| `variant_available_qty(variant_id)`          | `private` | Stok fisik − reservasi aktif; 0 bila varian/produk nonaktif.                                                                                                                    |
| `sync_product_variants(product_id, payload)` | `private` | Logika bersama create/update produk.                                                                                                                                            |
| `generate_order_number()`                    | `private` | `KB-YYYYMMDD-NNNN` (WIB).                                                                                                                                                       |
| `handle_new_user()`                          | `private` | Trigger `auth.users` → profile + cart.                                                                                                                                          |

`public.rls_auto_enable()` (milik fitur auto-RLS Supabase) dicabut `EXECUTE`-nya dari `anon`/`authenticated`.

---

## 3. Matriks Akses

`R` = SELECT, `W` = INSERT/UPDATE/DELETE, `—` = tidak ada akses, `own` = baris milik `auth.uid()`, `SR` = service role (server).

| Tabel                                                                                     | anon                            | customer                                      | admin                        | Penulis lain                                                                                                                        |
| ----------------------------------------------------------------------------------------- | ------------------------------- | --------------------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| profiles                                                                                  | —                               | R own, U own (`full_name, phone, avatar_url`) | R semua                      | trigger (insert), RPC `admin_set_role`                                                                                              |
| addresses                                                                                 | —                               | R/W own                                       | R                            | Trigger: alamat pertama = utama, satu utama per user, utama tidak bisa dilepas langsung, hapus utama → promosikan terbaru, maks. 20 |
| store_settings                                                                            | —                               | —                                             | R/W                          | dibaca SR untuk Biteship                                                                                                            |
| categories                                                                                | R                               | R                                             | R/W                          |                                                                                                                                     |
| products, product_options, product_option_values, product_variant_options, product_images | R (produk aktif)                | sama                                          | R/W                          |                                                                                                                                     |
| product_variants                                                                          | R (aktif, **tanpa `quantity`**) | sama                                          | R/W (tanpa `quantity`)       | stok via RPC                                                                                                                        |
| stock_adjustments                                                                         | —                               | —                                             | R                            | RPC admin                                                                                                                           |
| carts                                                                                     | —                               | R own                                         | —                            | trigger, `get_or_create_cart`                                                                                                       |
| cart_items                                                                                | —                               | R/W own (`quantity` saja yang bisa di-update) | —                            | `create_order` (mengosongkan)                                                                                                       |
| orders, order_items                                                                       | —                               | R own                                         | R                            | SR                                                                                                                                  |
| payments                                                                                  | —                               | R own (tanpa `raw_response`)                  | R (tanpa `raw_response`)     | SR                                                                                                                                  |
| stock_reservations                                                                        | —                               | —                                             | R                            | SR / pg_cron                                                                                                                        |
| order_status_history                                                                      | —                               | R own (tanpa `raw_payload`)                   | R (tanpa `raw_payload`)      | SR                                                                                                                                  |
| order_internal_notes                                                                      | —                               | —                                             | R + insert (atas namanya)    |                                                                                                                                     |
| shipments                                                                                 | —                               | R own                                         | R, U (`waybill_id`, tanggal) | SR (insert)                                                                                                                         |

Catatan: tabel admin-only (mis. `order_internal_notes`, `stock_adjustments`) tetap di-`GRANT SELECT` ke `authenticated`; RLS yang memfilter sehingga customer mendapat **0 baris**, bukan error.

---

## 4. Lokasi Implementasi

| Migrasi                    | Isi                                                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `*_base.sql`               | extensions (`pg_trgm`, `pg_cron`), enums, schema `private`, default privileges, nomor order                         |
| `*_profiles_addresses.sql` | profiles, addresses, store_settings, trigger signup                                                                 |
| `*_catalog.sql`            | katalog + `stock_adjustments`                                                                                       |
| `*_cart.sql`               | carts, cart_items                                                                                                   |
| `*_orders.sql`             | orders, order_items, payments, stock_reservations, history, notes, shipments                                        |
| `*_rls.sql`                | `private.is_admin()`, RLS, grants, semua policy                                                                     |
| `*_storage.sql`            | bucket `product-images` + policy                                                                                    |
| `*_rpc_catalog_cart.sql`   | `get_variant_availability`, `get_or_create_cart`, `merge_guest_cart`                                                |
| `*_rpc_orders.sql`         | `create_order`, `cancel_order`, `confirm_payment`, `release_reservations`, `expire_pending_orders` + jadwal pg_cron |
| `*_rpc_admin.sql`          | `admin_create_product`, `admin_update_product`, `admin_get_stock`, `admin_adjust_stock`, `admin_set_role`           |
| `*_product_listings.sql`   | view `product_listings` (security_invoker)                                                                          |
| `*_preorder.sql`           | kolom pre-order produk + snapshot di `order_items`                                                                  |
| `*_cart_adopt_guest.sql`   | `merge_guest_cart` → `adopted` / `kept`                                                                             |
| `*_address_rules.sql`      | trigger buku alamat (satu utama, maks. 20)                                                                          |

---

## 5. Supabase Storage

Bucket `product-images`: **public** (dibaca lewat URL publik/CDN), MIME `image/jpeg|png|webp`, maks 5 MB. Policy `storage.objects` untuk select/insert/update/delete hanya bila `bucket_id = 'product-images'` dan `private.is_admin()`.

---

## 6. RPC

| RPC                                                                                                      | Execute oleh                       | Fungsi                                                                                                                                                                                                                        |
| -------------------------------------------------------------------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `get_variant_availability(variant_ids uuid[])`                                                           | anon, authenticated                | Stok tersedia per varian (maks 200 id).                                                                                                                                                                                       |
| `get_or_create_cart()`                                                                                   | authenticated                      | Pakai `auth.uid()`.                                                                                                                                                                                                           |
| `merge_guest_cart(items jsonb)`                                                                          | authenticated                      | `[{variant_id, quantity}]` maks 50. Cart DB berisi → `kept` (cart guest diabaikan); kosong → `adopted` (varian nonaktif/habis diabaikan; quantity ≤ stok tersedia dan ≤ 10). Lock baris `carts` mencegah duplikasi antar tab. |
| `cancel_order(order_id)`                                                                                 | authenticated                      | Hanya pemilik & `pending_payment`; release reservasi; attempt pending → `cancel`. Server Action membatalkan transaksi Midtrans lebih dulu.                                                                                    |
| `admin_create_product(payload)` / `admin_update_product(id, payload)`                                    | authenticated (cek admin di dalam) | Produk + opsi + varian dalam 1 transaksi; menolak 0 varian, mapping opsi tidak lengkap, kombinasi duplikat. Varian yang dibuang: dihapus bila belum pernah dipesan, selain itu dinonaktifkan.                                 |
| `admin_get_stock(ids)` / `admin_adjust_stock(id, delta, reason)`                                         | authenticated (cek admin)          | Satu-satunya jalur baca/ubah stok fisik; perubahan tercatat di `stock_adjustments`.                                                                                                                                           |
| `admin_set_role(user_id, role)`                                                                          | authenticated (cek admin)          | Satu-satunya jalur mengubah role; admin terakhir tidak bisa diturunkan.                                                                                                                                                       |
| **`create_order(profile_id, address_id, courier_code, courier_service, shipping_cost, customer_note?)`** | **service_role**                   | Harga dari DB, kunci varian `FOR UPDATE`, reservasi 24 jam, snapshot alamat & item, kosongkan cart.                                                                                                                           |
| `confirm_payment(order_id)`                                                                              | service_role                       | Idempoten. Reservasi → confirmed + kurangi stok. Bayar telat: reserve ulang; stok kurang → `attention_reason = late_payment_out_of_stock`.                                                                                    |
| `release_reservations(order_id)`                                                                         | service_role                       |                                                                                                                                                                                                                               |
| `expire_pending_orders()`                                                                                | service_role (pg_cron tiap menit)  | Order lewat batas → `expired`, release reservasi, attempt pending kadaluarsa → `expire`.                                                                                                                                      |

Peringatan advisor _"security definer function executable"_ untuk RPC di atas (selain yang service_role) **disengaja** — fungsi itu memang API untuk client dan memvalidasi pemanggil di dalamnya.

---

## 7. Verifikasi

- `bun run db:test` — runner `scripts/db-test.mjs` menjalankan `supabase/tests/*.test.sql` ke project linked lewat `supabase db query`, masing-masing dalam transaksi yang di-rollback (tanpa Docker). Mencakup anon/customer/admin, column grants, create_order, stok kurang, confirm idempoten, expire, bayar telat (stok ada/habis), cancel, merge cart, RPC admin.
- `bun run db:advisors` — Security & Performance Advisor (target: hanya peringatan RPC yang disengaja).
- Sebelum rilis:
  - [ ] `bun run db:test` hijau terhadap project **prod** sebelum dibuka ke publik.
  - [ ] Advisor bersih di prod.
  - [ ] `service_role` key hanya di env server, tidak berawalan `NEXT_PUBLIC_`.
  - [ ] Uji race checkout (dua sesi bersamaan, stok 1) secara manual/E2E — tidak bisa dalam satu transaksi tes.
