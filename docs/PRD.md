# KenBike E-Commerce — PRD & Arsitektur (v3, BaaS)

> **Last Updated:** 2026-10-11
> **Repo/app:** `kenbike-baas` — **satu aplikasi** Next.js 16.4 (App Router) + Supabase sebagai backend. Tidak ada backend terpisah.
> Dokumen terkait: [ERD-ecommerce.dbml](ERD-ecommerce.dbml) · [RLS-POLICIES.md](RLS-POLICIES.md) · [FE-STRUCTURE-FOLDER.md](FE-STRUCTURE-FOLDER.md)

---

## 1. Overview Infrastruktur

| Komponen                | Layanan                | Keterangan                                                                                       |
| ----------------------- | ---------------------- | ------------------------------------------------------------------------------------------------ |
| App (UI + server logic) | Next.js 16.4, React 19 | Server Components untuk baca data, Server Actions untuk mutasi, Route Handlers untuk webhook.    |
| Database                | Supabase PostgreSQL    | Migrasi via **Supabase CLI** (`supabase/migrations`). Tipe TS digenerate (`supabase gen types`). |
| Auth                    | Supabase Auth          | Session cookie via `@supabase/ssr`.                                                              |
| Storage                 | Supabase Storage       | Bucket `product-images` (publik).                                                                |
| Job terjadwal           | `pg_cron` (Supabase)   | Release reservasi stok kadaluarsa.                                                               |
| Payment                 | Midtrans Snap          | Dipanggil hanya dari server.                                                                     |
| Shipping                | Biteship               | Cek ongkir, create order, tracking via webhook.                                                  |
| Hosting                 | Vercel                 | Region app dekat region Supabase (Singapore).                                                    |
| Package manager         | **bun**                | Sesuai `packageManager` di `package.json`.                                                       |

> **Next.js 16:** `middleware.ts` sudah berganti nama menjadi **`proxy.ts`**. Selalu cek `node_modules/next/dist/docs/` sebelum memakai API Next (lihat `AGENTS.md`) — versi ini punya breaking changes.

---

## 2. Tech Stack

| Kategori        | Pilihan                                   | Catatan                                                                                                                     |
| --------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Framework       | Next.js 16.4 App Router                   | Server Components default; `"use client"` hanya bila perlu.                                                                 |
| Supabase client | `@supabase/ssr` + `@supabase/supabase-js` | 3 client: browser, server (cookie), admin (service role, server-only).                                                      |
| State client    | Zustand                                   | Guest cart, filter, UI state.                                                                                               |
| Server state    | TanStack Query                            | **Ditunda.** Mulai dengan Server Components + Server Actions; tambah hanya untuk interaksi yang butuh cache/polling client. |
| Form + validasi | React Hook Form + Zod                     | Skema Zod dipakai ulang di Server Action (validasi ulang di server wajib).                                                  |
| UI              | shadcn/ui + Tailwind CSS v4               |                                                                                                                             |
| Toast           | Sonner                                    |                                                                                                                             |
| Tabel admin     | TanStack Table                            |                                                                                                                             |
| i18n            | next-intl                                 | Opsional, di luar MVP.                                                                                                      |

---

## 3. Fitur & Behavior Sistem

### 3.0 Scope MVP

**Customer:** registrasi/login (email + password dengan verifikasi email, dan Google OAuth), browse & cari produk (kategori, varian), keranjang (guest + login), kelola alamat, checkout (pilih alamat → kurir/ongkir → bayar Midtrans), riwayat order & tracking, batalkan order yang belum dibayar.

**Admin:** CRUD produk + varian + gambar + kategori, daftar & detail order, update stok, catatan internal order, lihat status pengiriman, daftar order **"perlu tindakan"** (`attention_reason`: refund manual bayar-telat, retry create order Biteship, nominal tidak cocok, bayar dobel).

**Role:** hanya `customer` dan `admin` (tidak ada role staff di MVP).

**Di luar MVP:** review, voucher/kupon, wishlist, refund otomatis (refund dilakukan manual di dashboard Midtrans), email notifikasi (kecuali email auth bawaan Supabase), multi-gudang, role staff, i18n.

### 3.1 Autentikasi & Keamanan

- Auth via Supabase; session di-refresh di `proxy.ts` (optimistic redirect untuk `/admin`, `/checkout`, `/account`).
- **`proxy.ts` bukan otorisasi.** Otorisasi nyata = cek `supabase.auth.getUser()` di setiap Server Action / Route Handler **+ RLS**. Jangan pakai `getSession()` untuk keputusan keamanan di server.
- **Metode login:** email + password (wajib konfirmasi email) dan Google OAuth. Keduanya kembali lewat `app/(auth)/auth/callback/route.ts` (`exchangeCodeForSession`), lalu guest cart di-merge. Akun Google dan email yang sama ditautkan otomatis oleh Supabase (identity linking) bila email terverifikasi.
- `profiles` dibuat trigger `handle_new_user()` saat signup (mengisi `full_name`/`avatar_url` dari metadata Google bila ada). `role` (`customer | admin`) **tidak bisa diubah user sendiri**.
- **Admin pertama** dibuat manual: daftar seperti user biasa, lalu jalankan `update public.profiles set role = 'admin' where id = '<uuid>'` di SQL Editor Supabase. Admin berikutnya via RPC `admin_set_role`.
- Detail policy per tabel: [RLS-POLICIES.md](RLS-POLICIES.md).
- Secret (`SUPABASE_SERVICE_ROLE_KEY`, `MIDTRANS_SERVER_KEY`, `BITESHIP_API_KEY`) hanya diakses modul `server-only`.

### 3.2 Katalog

- Produk punya ≥ 1 varian (harga/stok/SKU/berat/dimensi di varian). Opsi varian dinamis (Warna, Ukuran, dst).
- Hapus produk = soft delete (`is_active = false`).
- Pencarian: `pg_trgm` pada `products.name`.

### 3.3 Cart

- **Guest:** Zustand + localStorage.
- **Login:** tabel `carts`/`cart_items`. Saat login, cart lokal di-merge lewat RPC `merge_guest_cart`.
- Harga **tidak pernah** dipercaya dari client; selalu diambil dari DB saat checkout.
- **Checkout wajib login.**
- **Cart dikosongkan saat order dibuat** (di dalam `create_order`). Jika order expired/dibatalkan, user belanja ulang (opsional nanti: tombol "beli lagi" dari detail order).

### 3.4 Manajemen Stok (model reservasi)

- Stok tersedia = `product_variants.quantity` − reservasi `reserved` yang belum kadaluarsa. Customer membacanya lewat RPC `get_variant_availability()`; angka stok fisik tidak terbuka ke publik.
- `create_order` (RPC, satu transaksi, **hanya service role**): kunci varian `FOR UPDATE` → cek stok → insert order + items + reservasi + snapshot alamat → kosongkan cart. Stok fisik **belum** berkurang.
- Bayar sukses → reservasi `confirmed` dan `quantity` dikurangi.
- Expired/batal → reservasi `released`.
- `pg_cron` tiap menit memanggil `expire_pending_orders()` (backup untuk webhook `expire` Midtrans; keduanya idempotent).

#### Parameter expiry

| Parameter               | Nilai                                          | Keterangan                                                                                                              |
| ----------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `ORDER_TTL`             | **24 jam**                                     | `orders.expires_at = created_at + 24j`. Selama ini stok di-reserve.                                                     |
| `PAYMENT_BUFFER`        | **15 menit**                                   | Expiry Snap selalu berakhir ≥ 15 menit sebelum order expired, agar webhook yang telat tetap masuk sebelum stok dilepas. |
| Expiry Snap per attempt | `MIN(now() + 23j45m, orders.expires_at − 15m)` | Retry bayar **tidak** memperpanjang `orders.expires_at`. Bila sisa waktu < 15 menit, retry ditolak.                     |

#### Bayar telat (settlement untuk order yang sudah `expired`)

Kasus langka (mis. webhook Midtrans sangat terlambat):

1. Webhook mencoba **reserve ulang** stok (kunci `FOR UPDATE`).
2. Stok cukup → proses normal (`paid`, stok dikurangi, buat pengiriman).
3. Stok tidak cukup → `payment_status = paid`, `attention_reason = late_payment_out_of_stock`, tidak dikirim; admin melakukan **refund manual**.

### 3.5 Order Lifecycle & State Machine

**`payment_status`:** `pending_payment` → `paid` | `expired` | `failed` | `cancelled`; `expired` → `paid` (hanya kasus bayar telat); `paid` → `refunded` (manual oleh admin).
`failed` hanya untuk penolakan final dari gateway (mis. fraud `deny`); kegagalan teknis membuat Snap token **tidak** mengubah status order.
**`shipping_status`:** `null` → (setelah paid) `pending` → `processing` → `shipped` → `delivered` | `returned`; `cancelled` dari `pending/processing`.

Transisi di luar tabel ini ditolak (ditegakkan di RPC/handler). Nilai mentah provider disimpan di `order_status_history`.

### 3.6 Alur Checkout

1. Customer pilih alamat → Server Action memanggil Biteship **rates** (origin dari `store_settings`, destination dari alamat, berat/dimensi dari varian) → customer pilih kurir/layanan.
2. Server Action: `getUser()` → validasi Zod → **hitung ulang ongkir ke Biteship di server** untuk kurir yang dipilih → panggil RPC `create_order` memakai **admin client** (service role) dengan `profile_id` dari session, bukan dari client.
   - `create_order` di-`revoke execute` dari `anon`/`authenticated`. Kalau tidak, user bisa memanggilnya langsung via PostgREST (`/rest/v1/rpc/create_order`) dengan `shipping_cost = 0`.
3. Server Action membuat `payments` row baru dengan `gateway_order_id` unik dan expiry sesuai §3.4, lalu menembak Midtrans Snap → simpan `snap_token` → return ke client.
   - **Jika Midtrans gagal (error teknis):** order tetap `pending_payment`, stok tetap ter-reserve sampai expiry; user melihat tombol "Coba bayar lagi". Attempt yang gagal ditandai `failure`.
4. Client membuka Snap popup.
5. Midtrans → `POST /api/webhooks/midtrans`.
6. Route handler: verifikasi signature → cek `gross_amount` = `payments.amount` (beda → `attention_reason = amount_mismatch`, stop) → insert `order_status_history` (`ON CONFLICT (source, event_key) DO NOTHING`; bila duplikat, balas 200 dan berhenti) → update `payments` & `orders.payment_status` → bila `paid`: `confirm_payment` (kurangi stok; bila order sudah expired → alur "bayar telat" §3.4) → balas 200, lalu **`after()`**: buat order Biteship (+ row `shipments`).
   - Bila pembuatan order Biteship gagal: order tetap `paid`, `shipping_status = pending`, `attention_reason = shipment_create_failed` (admin retry manual). Webhook tidak boleh gagal karena ini.
7. Biteship → `POST /api/webhooks/biteship` memperbarui `shipping_status`, resi, timeline.
8. **Retry bayar / ganti metode:** selama order `pending_payment` dan sisa waktu ≥ 15 menit. Sebelum attempt baru dibuat, attempt `pending` sebelumnya **dibatalkan via Midtrans Cancel API** (mencegah bayar dobel). Hanya boleh ada satu attempt `pending` per order (partial unique index).
   - Bila tetap terjadi dua settlement untuk satu order (race sangat jarang): attempt kedua dicatat dan order diberi `attention_reason = duplicate_payment` untuk refund manual.

### 3.7 Webhook — aturan wajib

- Verifikasi signature Midtrans: `SHA512(order_id + status_code + gross_amount + ServerKey)` (modul `crypto` Node).
- Biteship: verifikasi lewat secret yang kita pasang di URL/header webhook (cek dokumentasi Biteship saat implementasi); jangan percaya payload mentah.
- Idempoten, cepat (< beberapa detik, ingat batas durasi function Vercel), selalu balas 2xx untuk event yang sudah diproses.
- Pakai `service_role` (bypass RLS) hanya di handler ini.

---

## 4. Environment Variables

`.env.local` (jangan di-commit; sediakan `.env.example`):

```env
# Supabase (public)
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT_REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=ey...

# Supabase (SECRET — server only)
SUPABASE_SERVICE_ROLE_KEY=ey...

# Midtrans
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=SB-Mid-client-...
MIDTRANS_SERVER_KEY=SB-Mid-server-...
MIDTRANS_IS_PRODUCTION=false

# Biteship
BITESHIP_API_KEY=...
BITESHIP_WEBHOOK_SECRET=...

# App
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## 5. Pengembangan & Deployment

- **Lokal:** Supabase CLI (`supabase start`) untuk DB lokal; migrasi di `supabase/migrations`; `supabase gen types typescript` → `types/database.types.ts`.
- **Webhook lokal:** tunnel (mis. ngrok/cloudflared) untuk menerima callback Midtrans/Biteship.
- **Produksi:** Vercel (auto-deploy branch `main`) + proyek Supabase terpisah dari dev. Migrasi dijalankan lewat `supabase db push`.
- **Google OAuth:** buat OAuth Client di Google Cloud Console, isi Client ID/Secret di Supabase Dashboard → Auth → Providers → Google; daftarkan redirect URL `<SITE_URL>/auth/callback` (lokal & produksi) di Supabase → Auth → URL Configuration.
- **Testing:** unit (Vitest) untuk util/skema Zod/signature; uji RLS dengan 3 identitas (anon, customer, admin); uji RPC `create_order` untuk race condition (dua checkout bersamaan, stok 1); uji skenario bayar-telat dan webhook duplikat.
- **Observability:** log error webhook; halaman admin "order perlu tindakan".

---

## 6. Roadmap Implementasi (urutan kerja)

1. Setup: dependensi (Supabase, Zod, RHF, Zustand, shadcn, Sonner), struktur folder, `lib/supabase/*`, `proxy.ts`.
2. Supabase: migrasi enum + tabel + trigger + RLS + RPC, seed data. Generate types.
3. Auth (register/login/logout, profil).
4. Katalog (list, detail, pencarian) + admin CRUD produk & upload gambar.
5. Cart (guest + login + merge).
6. Alamat + integrasi Biteship rates.
7. Checkout + `create_order` + Midtrans Snap.
8. Webhook Midtrans & Biteship, riwayat order, tracking.
9. Admin order management, hardening (checklist RLS), deploy.

_(Dokumen hidup — perbarui seiring pengembangan.)_
