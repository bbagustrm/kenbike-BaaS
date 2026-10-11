# KenBike — Roadmap Implementasi

> Sumber kebenaran status: [GitHub Project #11](https://github.com/users/bbagustrm/projects/11). Dokumen ini hanya peta urutan kerja.
> Issue: https://github.com/bbagustrm/kenbike-BaaS/issues

Prioritas: **P0** wajib untuk MVP · **P1** penting · **P2** bisa menyusul. Size: XS < S < M < L < XL.

## M0 · Foundation — #1

Tooling, dependensi, struktur folder, layout dasar, CI & deploy preview.

| # | Task | Prio | Size |
|---|---|---|---|
| #12 | Pindahkan dokumen perencanaan ke repo & perbarui README | P0 | XS |
| #13 | Install dependensi inti | P0 | XS |
| #14 | Setup tooling: Prettier, ESLint, TypeScript strict, Vitest | P1 | S |
| #15 | Setup shadcn/ui, tema, dark mode, dan app/providers.tsx | P0 | S |
| #16 | Buat struktur folder & konvensi sesuai FE-STRUCTURE | P0 | XS |
| #17 | Validasi environment variables (lib/env.ts) & .env.example | P0 | S |
| #18 | Tetapkan pola data & caching untuk Cache Components (Next 16) | P0 | S |
| #19 | Layout dasar toko: Navbar, Footer, halaman error & 404 | P1 | M |
| #20 | CI GitHub Actions: lint, typecheck, test, build | P1 | S |
| #21 | Hubungkan Vercel: preview & production deploy | P1 | S |

## M1 · Database & Security — #2

Skema Supabase, RLS, Storage, RPC, seed, dan tes database.

| # | Task | Prio | Size |
|---|---|---|---|
| #22 | Setup Supabase project (dev/prod) & Supabase CLI lokal | P0 | S |
| #23 | Migrasi: extensions, enums, trigger utilitas | P0 | S |
| #24 | Migrasi: profiles, addresses, store_settings + trigger handle_new_user | P0 | M |
| #25 | Migrasi: tabel katalog (kategori, produk, opsi, varian, gambar) | P0 | M |
| #26 | Migrasi: carts & cart_items | P0 | XS |
| #27 | Migrasi: orders, order_items, payments, stock_reservations, history, notes, shipments | P0 | L |
| #28 | RLS: helper is_admin, policies semua tabel, column grants, views my_* | P0 | L |
| #29 | Storage bucket product-images & policies | P0 | XS |
| #30 | RPC: get_variant_availability, get_or_create_cart, merge_guest_cart | P0 | M |
| #31 | RPC: create_order, cancel_order, confirm_payment, release_reservations, expire_pending_orders + pg_cron | P0 | XL |
| #32 | RPC admin: create/update product, get/adjust stock, set role | P0 | L |
| #33 | Seed data & generate TypeScript types | P1 | S |
| #34 | Tes database (pgTAP): RLS & RPC | P0 | L |

## M2 · Auth & Profile — #3

Supabase client, proxy.ts, email/password, Google OAuth, profil.

| # | Task | Prio | Size |
|---|---|---|---|
| #35 | Supabase clients (browser/server/admin/public) & proxy.ts | P0 | M |
| #36 | Register, login, verifikasi email, lupa & reset password | P0 | M |
| #37 | Login Google OAuth + route /auth/callback | P0 | S |
| #38 | Logout, UserMenu, guard requireUser/requireAdmin | P0 | S |
| #39 | Halaman akun: edit profil | P1 | S |
| #40 | Template email auth Supabase (Bahasa Indonesia) & SMTP | P2 | XS |

## M3 · Catalog & Admin Products — #4

Katalog publik dan CRUD produk/varian/gambar di admin.

| # | Task | Prio | Size |
|---|---|---|---|
| #41 | Query katalog: list, filter, sort, search, detail | P0 | M |
| #42 | Halaman beranda | P1 | M |
| #43 | Halaman daftar produk dengan filter, pencarian, pagination | P0 | L |
| #44 | Halaman detail produk & VariantPicker | P0 | L |
| #45 | SEO: metadata, sitemap, robots, OG, JSON-LD | P2 | M |
| #46 | Admin layout & navigasi | P0 | M |
| #47 | Admin: CRUD kategori | P1 | S |
| #48 | Admin: list & form produk dengan builder opsi + matriks varian | P0 | XL |
| #49 | Admin: upload, urutkan, dan hapus gambar produk/varian | P0 | M |
| #50 | Admin: lihat & sesuaikan stok | P1 | S |

## M4 · Cart — #5

Guest cart, cart login, merge saat login.

| # | Task | Prio | Size |
|---|---|---|---|
| #51 | Guest cart store (Zustand + localStorage) | P0 | S |
| #52 | Cart user login: Server Actions & query | P0 | M |
| #53 | Merge guest cart saat login | P0 | S |
| #54 | UI keranjang: drawer, halaman cart, badge | P0 | M |

## M5 · Address & Shipping — #6

Buku alamat, client Biteship, cek ongkir, alamat toko.

| # | Task | Prio | Size |
|---|---|---|---|
| #55 | lib/biteship: client server-only + types + unit test | P0 | M |
| #56 | Admin: pengaturan alamat toko (origin) | P0 | S |
| #57 | Buku alamat customer + autocomplete area Biteship | P0 | M |
| #58 | Cek ongkir: Server Action getShippingRates | P0 | M |

## M6 · Checkout & Payment — #7

Halaman checkout, create_order, Midtrans Snap, retry & cancel.

| # | Task | Prio | Size |
|---|---|---|---|
| #59 | lib/midtrans: Snap, cancel, status, signature + unit test | P0 | M |
| #60 | Halaman checkout | P0 | L |
| #61 | Server Action createOrderAndPay | P0 | L |
| #62 | Integrasi Snap.js & halaman hasil pembayaran | P0 | M |
| #63 | Retry / ganti metode pembayaran | P1 | M |
| #64 | Customer membatalkan order pending | P1 | S |

## M7 · Webhooks & Fulfillment — #8

Webhook Midtrans & Biteship, pembuatan shipment.

| # | Task | Prio | Size |
|---|---|---|---|
| #65 | Webhook Midtrans: signature, nominal, idempotensi, transisi status | P0 | XL |
| #66 | Buat order Biteship setelah paid (+ retry admin) | P0 | L |
| #67 | Webhook Biteship: status, resi, timeline | P0 | M |

## M8 · Customer Orders — #9

Riwayat & detail order, tracking.

| # | Task | Prio | Size |
|---|---|---|---|
| #68 | Riwayat order customer | P0 | M |
| #69 | Detail order & tracking | P0 | M |

## M9 · Admin Orders — #10

Manajemen order, 'perlu tindakan', dashboard.

| # | Task | Prio | Size |
|---|---|---|---|
| #70 | Admin: daftar order | P0 | M |
| #71 | Admin: detail order & aksi | P0 | L |
| #72 | Admin: dashboard ringkasan | P1 | M |
| #73 | Admin: daftar pengguna & ubah role | P2 | S |

## M10 · QA & Launch — #11

E2E, hardening, monitoring, halaman legal, produksi.

| # | Task | Prio | Size |
|---|---|---|---|
| #74 | E2E test (Playwright) alur utama | P1 | L |
| #75 | Security hardening & review | P0 | M |
| #76 | Logging & error monitoring | P1 | S |
| #77 | Audit performa & aksesibilitas | P2 | S |
| #78 | Halaman legal & informasi toko | P0 | S |
| #79 | Go-live produksi | P0 | M |

## Jalur kritis (urutan minimum menuju transaksi pertama)

#13 → #17 → #18 → #22 → #23 → #24 → #25 → #26 → #27 → #28 → #30 → #31 → #35 → #36 → #41 → #44 → #51 → #52 → #55 → #57 → #58 → #59 → #60 → #61 → #62 → #65 → #66
