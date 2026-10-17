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
| refunds                                                                                   | —                               | R own (termasuk rekening tujuan)              | R                            | RPC `cancel_paid_order`, `set_refund_account`, `complete_refund`; SR (webhook refund Midtrans)                                      |
| conversations                                                                             | —                               | R own                                         | R                            | RPC `start_conversation`, `set_conversation_status`, `mark_conversation_read`; trigger dari `messages`; SR `post_system_message`    |
| messages                                                                                  | —                               | R (percakapan miliknya)                       | R                            | RPC `send_message` (peran pengirim ditentukan server), SR `post_system_message`                                                     |

Catatan: tabel admin-only (mis. `order_internal_notes`, `stock_adjustments`) tetap di-`GRANT SELECT` ke `authenticated`; RLS yang memfilter sehingga customer mendapat **0 baris**, bukan error.

---

## 4. Lokasi Implementasi

| Migrasi                         | Isi                                                                                                                 |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `*_base.sql`                    | extensions (`pg_trgm`, `pg_cron`), enums, schema `private`, default privileges, nomor order                         |
| `*_profiles_addresses.sql`      | profiles, addresses, store_settings, trigger signup                                                                 |
| `*_catalog.sql`                 | katalog + `stock_adjustments`                                                                                       |
| `*_cart.sql`                    | carts, cart_items                                                                                                   |
| `*_orders.sql`                  | orders, order_items, payments, stock_reservations, history, notes, shipments                                        |
| `*_rls.sql`                     | `private.is_admin()`, RLS, grants, semua policy                                                                     |
| `*_storage.sql`                 | bucket `product-images` + policy                                                                                    |
| `*_rpc_catalog_cart.sql`        | `get_variant_availability`, `get_or_create_cart`, `merge_guest_cart`                                                |
| `*_rpc_orders.sql`              | `create_order`, `cancel_order`, `confirm_payment`, `release_reservations`, `expire_pending_orders` + jadwal pg_cron |
| `*_rpc_admin.sql`               | `admin_create_product`, `admin_update_product`, `admin_get_stock`, `admin_adjust_stock`, `admin_set_role`           |
| `*_product_listings.sql`        | view `product_listings` (security_invoker)                                                                          |
| `*_preorder.sql`                | kolom pre-order produk + snapshot di `order_items`                                                                  |
| `*_cart_adopt_guest.sql`        | `merge_guest_cart` → `adopted` / `kept`                                                                             |
| `*_address_rules.sql`           | trigger buku alamat (satu utama, maks. 20)                                                                          |
| `*_shipment_tracking.sql`       | `shipments.tracking_id`, `tracking_url` (link lacak Biteship)                                                       |
| `*_admin_orders.sql`            | `admin_list_users` (email dari auth.users), `admin_dashboard_stats` (agregasi omzet/antrian/stok menipis)           |
| `*_store_contact_email.sql`     | `store_settings.email` (kontak publik, dibaca server & di-cache)                                                    |
| `*_rate_limit.sql`              | `private.rate_limits` + `check_rate_limit` (service role saja) + cron cleanup                                       |
| `*_cron_health.sql`             | `admin_cron_health` (status job pg_cron untuk dashboard)                                                            |
| `*_refund_enums.sql`            | `payment_status.refund_pending`, enum `refund_status`                                                               |
| `*_refunds.sql`                 | tabel `refunds`, RPC pembatalan & refund, bucket `refund-proofs`                                                    |
| `*_refund_requires_account.sql` | `complete_refund` mewajibkan rekening tujuan                                                                        |
| `*_chat.sql`                    | conversations, messages, RPC chat, publikasi Realtime, bucket `chat-attachments`                                    |

---

## 5. Supabase Storage

Bucket `product-images`: **public** (dibaca lewat URL publik/CDN), MIME `image/jpeg|png|webp`, maks 5 MB. Policy `storage.objects` untuk select/insert/update/delete hanya bila `bucket_id = 'product-images'` dan `private.is_admin()`.

Bucket `refund-proofs`: **privat**, MIME `image/jpeg|png|webp`, `application/pdf`, maks 5 MB, path `{order_id}/{file}`. Tulis/hapus hanya admin; baca admin & pembeli pemilik order (folder pertama = id order miliknya).

Bucket `chat-attachments`: **privat**, MIME `image/jpeg|png|webp`, `application/pdf`, maks 5 MB, path `{conversation_id}/{uuid}.{ext}`. Unggah & baca: peserta percakapan (pemilik + admin) lewat `private.chat_folder_access`; hapus hanya admin.

Realtime: `messages` & `conversations` ada di publikasi `supabase_realtime`; `postgres_changes` mengikuti policy SELECT di atas sehingga pembeli hanya menerima event percakapannya sendiri.

---

## 6. RPC

| RPC                                                                                                      | Execute oleh                       | Fungsi                                                                                                                                                                                                                                                           |
| -------------------------------------------------------------------------------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `get_variant_availability(variant_ids uuid[])`                                                           | anon, authenticated                | Stok tersedia per varian (maks 200 id).                                                                                                                                                                                                                          |
| `get_or_create_cart()`                                                                                   | authenticated                      | Pakai `auth.uid()`.                                                                                                                                                                                                                                              |
| `merge_guest_cart(items jsonb)`                                                                          | authenticated                      | `[{variant_id, quantity}]` maks 50. Cart DB berisi → `kept` (cart guest diabaikan); kosong → `adopted` (varian nonaktif/habis diabaikan; quantity ≤ stok tersedia dan ≤ 10). Lock baris `carts` mencegah duplikasi antar tab.                                    |
| `cancel_order(order_id)`                                                                                 | authenticated                      | Hanya pemilik & `pending_payment`; release reservasi; attempt pending → `cancel`. Server Action membatalkan transaksi Midtrans lebih dulu.                                                                                                                       |
| `cancel_paid_order(order_id, reason, restock?)`                                                          | authenticated (pemilik atau admin) | Order lunas yang belum diambil kurir (`shipping_status` null/pending/processing) → `refund_pending` + pengiriman `cancelled`, stok dikembalikan (admin boleh `restock = false`), buat baris `refunds` penuh. Order Biteship dibatalkan Server Action lebih dulu. |
| `set_refund_account(order_id, bank, nomor, nama)`                                                        | authenticated (pemilik atau admin) | Isi/ubah rekening tujuan selama refund belum selesai → `pending_transfer`.                                                                                                                                                                                       |
| `complete_refund(order_id, proof_path, note)`                                                            | authenticated (cek admin)          | Bukti (`{order_id}/…` di `refund-proofs`) atau catatan wajib → refund `completed`, order `refunded`.                                                                                                                                                             |
| `start_conversation(subject, order_id?)`                                                                 | authenticated                      | Chat umum, atau chat pesanan milik pemanggil (satu per order; yang sudah ada dikembalikan).                                                                                                                                                                      |
| `send_message(conversation_id, body, attachments?)`                                                      | authenticated (pemilik atau admin) | Teks ≤ 4000 dan/atau ≤ 5 lampiran di folder percakapan; peran `customer`/`admin` dari `is_admin()`. Balasan pembeli membuka kembali percakapan.                                                                                                                  |
| `mark_conversation_read(id)` / `unread_conversation_count()`                                             | authenticated                      | Penanda dibaca per sisi; badge (admin: terbuka & pesan terakhir dari pembeli).                                                                                                                                                                                   |
| `set_conversation_status(id, status)`                                                                    | authenticated (cek admin)          | Tutup / buka kembali.                                                                                                                                                                                                                                            |
| `post_system_message(order_id, body)`                                                                    | service_role                       | Pesan sistem ke chat pesanan (dibuat bila belum ada).                                                                                                                                                                                                            |
| `admin_create_product(payload)` / `admin_update_product(id, payload)`                                    | authenticated (cek admin di dalam) | Produk + opsi + varian dalam 1 transaksi; menolak 0 varian, mapping opsi tidak lengkap, kombinasi duplikat. Varian yang dibuang: dihapus bila belum pernah dipesan, selain itu dinonaktifkan.                                                                    |
| `admin_get_stock(ids)` / `admin_adjust_stock(id, delta, reason)`                                         | authenticated (cek admin)          | Satu-satunya jalur baca/ubah stok fisik; perubahan tercatat di `stock_adjustments`.                                                                                                                                                                              |
| `admin_set_role(user_id, role)`                                                                          | authenticated (cek admin)          | Satu-satunya jalur mengubah role; admin terakhir tidak bisa diturunkan.                                                                                                                                                                                          |
| **`create_order(profile_id, address_id, courier_code, courier_service, shipping_cost, customer_note?)`** | **service_role**                   | Harga dari DB, kunci varian `FOR UPDATE`, reservasi 24 jam, snapshot alamat & item, kosongkan cart.                                                                                                                                                              |
| `confirm_payment(order_id)`                                                                              | service_role                       | Idempoten. Reservasi → confirmed + kurangi stok. Bayar telat: reserve ulang; stok kurang → `attention_reason = late_payment_out_of_stock`.                                                                                                                       |
| `release_reservations(order_id)`                                                                         | service_role                       |                                                                                                                                                                                                                                                                  |
| `expire_pending_orders()`                                                                                | service_role (pg_cron tiap menit)  | Order lewat batas → `expired`, release reservasi, attempt pending kadaluarsa → `expire`.                                                                                                                                                                         |

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
