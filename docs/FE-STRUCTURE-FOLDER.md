# KenBike E-commerce — Struktur Folder Aplikasi

> **Last Updated:** 2026-10-11
> **App:** `kenbike-baas` — Next.js 16.4 (App Router), **satu aplikasi** fullstack + Supabase (BaaS)
> **Pola:** Feature-based + komponen UI bersama. (Atomic Design **tidak dipakai** — terlalu berat untuk skala ini.)
> Terkait: [PRD.md](PRD.md) · [ERD-ecommerce.dbml](ERD-ecommerce.dbml) · [RLS-POLICIES.md](RLS-POLICIES.md)

---

## 1. Prinsip

```
app/        → Routing, layout, Route Handlers (tipis; hanya merakit)
features/   → Domain bisnis: UI + Server Actions + query + skema (self-contained)
components/ → UI generik tanpa logika domain (shadcn + komponen bersama)
lib/        → Infrastruktur teknis (Supabase client, Midtrans, Biteship, util)
```

Aturan emas:
1. **Server-first.** Baca data di Server Components; mutasi lewat Server Actions. `"use client"` hanya untuk interaksi.
2. **Kode yang memakai secret wajib `server-only`** (`import "server-only"`), agar build gagal bila ter-import ke client.
3. **`app/` tipis.** Halaman hanya memanggil query dari feature dan merender komponen feature.
4. **Feature tidak meng-import internal feature lain** — hanya lewat `index.ts` (public API).
5. Validasi input **selalu diulang di server** (Zod) — skema yang sama boleh dipakai di form client.

---

## 2. Struktur Folder

Project memakai `app/` di **root** (tanpa `src/`). Alias `@/*` → root.

```
kenbike-baas/
├── app/
│   ├── layout.tsx                  # Root layout (Server Component)
│   ├── providers.tsx               # Provider client (theme, toaster, dst)
│   ├── globals.css
│   ├── (shop)/                     # Route group publik/customer
│   │   ├── layout.tsx              # Navbar + footer
│   │   ├── page.tsx                # Beranda
│   │   ├── products/
│   │   │   ├── page.tsx            # Daftar + filter + pencarian
│   │   │   └── [slug]/page.tsx     # Detail produk
│   │   ├── cart/page.tsx
│   │   ├── checkout/page.tsx       # Wajib login
│   │   └── account/                # Wajib login
│   │       ├── orders/page.tsx
│   │       ├── orders/[orderNumber]/page.tsx
│   │       └── addresses/page.tsx
│   ├── (auth)/                     # Route group auth
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── auth/callback/route.ts  # exchangeCodeForSession (konfirmasi email & Google OAuth), lalu merge guest cart
│   ├── (admin)/
│   │   └── admin/
│   │       ├── layout.tsx          # Cek role admin di server (requireAdmin)
│   │       ├── page.tsx            # Dashboard
│   │       ├── products/…
│   │       ├── categories/…
│   │       └── orders/…            # incl. filter "perlu tindakan" (attention_reason)
│   └── api/
│       └── webhooks/
│           ├── midtrans/route.ts
│           └── biteship/route.ts
│
├── proxy.ts                        # (ex-middleware) refresh session + optimistic redirect
│
├── features/
│   ├── auth/
│   │   ├── components/             # LoginForm, RegisterForm, GoogleButton, UserMenu
│   │   ├── actions.ts              # "use server": signIn, signUp, signInWithGoogle, signOut
│   │   ├── schemas.ts              # Zod
│   │   └── index.ts
│   ├── catalog/                    # produk, kategori, varian, pencarian
│   │   ├── components/             # ProductCard, ProductGrid, VariantPicker, Filters
│   │   ├── queries.ts              # fetch di server (list, detail, search)
│   │   ├── types.ts
│   │   └── index.ts
│   ├── cart/
│   │   ├── components/             # CartDrawer, CartItem, CartSummary
│   │   ├── store.ts                # Zustand (guest cart, persist)
│   │   ├── actions.ts              # add/update/remove (user login), mergeGuestCart
│   │   ├── queries.ts
│   │   └── index.ts
│   ├── address/
│   │   ├── components/             # AddressForm (incl. cari area Biteship), AddressList
│   │   ├── actions.ts
│   │   ├── queries.ts
│   │   └── index.ts
│   ├── checkout/
│   │   ├── components/             # ShippingOptions, OrderSummary, PayButton (Snap)
│   │   ├── actions.ts              # getShippingRates, createOrderAndPay
│   │   ├── schemas.ts
│   │   └── index.ts
│   ├── order/                      # riwayat & tracking sisi customer
│   │   ├── components/             # OrderList, OrderDetail, TrackingTimeline
│   │   ├── actions.ts              # cancelOrder, retryPayment
│   │   ├── queries.ts
│   │   └── index.ts
│   └── admin/                      # semua UI/aksi admin (dipisah per sub-domain)
│       ├── products/               # form produk+varian, tabel, upload gambar
│       ├── orders/                 # tabel order, detail, catatan internal, retry Biteship
│       ├── categories/
│       └── guards.ts               # requireAdmin() — dipanggil di layout DAN di tiap Server Action admin
│
├── components/
│   ├── ui/                         # shadcn/ui (di-generate CLI; jangan diubah sembarangan)
│   ├── layout/                     # Navbar, Footer, Container, PageHeader
│   └── shared/                     # PriceTag, QuantitySelector, EmptyState, ThemeToggle, DataTable
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # createBrowserClient (anon)
│   │   ├── server.ts               # createServerClient (cookies) — untuk RSC/Actions
│   │   ├── public.ts               # anon tanpa cookie — untuk query publik di "use cache"
│   │   ├── admin.ts                # service role — `import "server-only"`
│   │   └── proxy.ts                # helper updateSession() dipanggil dari /proxy.ts
│   ├── midtrans/                   # server-only: createSnapToken, verifySignature, mapStatus
│   ├── biteship/                   # server-only: rates, createOrder, searchArea, mapStatus
│   ├── env.ts                      # validasi env (Zod); pisahkan public vs server
│   ├── format.ts                   # formatRupiah, tanggal
│   └── utils.ts                    # cn() (shadcn)
│
├── hooks/                          # hook client lintas-feature saja (mis. use-media-query)
├── types/
│   └── database.types.ts           # hasil `supabase gen types typescript`
│
├── supabase/                       # (dibuat via `supabase init`)
│   ├── migrations/                 # SQL: enum, tabel, trigger, RLS, RPC
│   ├── seed.sql
│   └── config.toml
│
├── docs/                           # PRD, ERD, RLS, struktur folder, roadmap
├── public/
├── components.json                 # config shadcn
├── .env.example
└── AGENTS.md
```

---

## 3. Komponen UI

Tanpa hierarki atoms/molecules/organisms. Tiga lokasi saja:

| Lokasi | Isi | Contoh |
|---|---|---|
| `components/ui/` | Primitif shadcn hasil CLI | Button, Input, Dialog, Sheet, Select, Table |
| `components/shared/` | Gabungan generik tanpa logika domain | PriceTag, QuantitySelector, EmptyState, DataTable |
| `components/layout/` | Kerangka halaman | Navbar, Footer, Container |
| `features/<x>/components/` | Apa pun yang tahu soal domain | ProductCard, CartDrawer, AddressForm |

**Pohon keputusan:**
```
Apakah komponen tahu soal domain (produk, cart, order, alamat)?
├─ YA  → features/<domain>/components/
└─ TIDAK
   ├─ Primitif shadcn → components/ui/
   ├─ Kerangka halaman → components/layout/
   └─ Gabungan generik → components/shared/
```

Komponen dari CommerCN (cart, checkout, product-card, dst) diperlakukan sebagai **titik awal**: salin ke `features/<domain>/components/` lalu sesuaikan dengan data Supabase. Jangan simpan di folder terpisah.

---

## 4. Supabase Client — 4 Jenis

| File | Dipakai di | Key | Catatan |
|---|---|---|---|
| `lib/supabase/client.ts` | Client Components | anon | Hanya untuk interaksi yang memang perlu di browser (mis. realtime). Default-kan ke Server Actions. |
| `lib/supabase/server.ts` | RSC, Server Actions, Route Handler | anon + cookie user | Menghormati RLS. Dibuat **per request** (jangan simpan global). Membaca `cookies()` → **tidak boleh** dipakai di dalam `use cache`. |
| `lib/supabase/public.ts` | Query publik yang di-cache (katalog) | anon, **tanpa cookie** | Aman dipakai di dalam `use cache`. Hanya untuk data yang sama bagi semua pengunjung. |
| `lib/supabase/admin.ts` | Webhook, job, checkout (`create_order`), operasi sistem | **service role** | `import "server-only"`. Bypass RLS — pakai seminimal mungkin dan hanya setelah verifikasi user/input. |

### Cache Components (aktif di `next.config.ts`)

`cacheComponents: true` + `partialPrefetching: true` sudah aktif. Aturannya:
- **Data publik** (produk, kategori): fungsi query diberi `"use cache"` + `cacheTag(...)` + `cacheLife(...)`, memakai `lib/supabase/public.ts`.
- **Data per-user** (cart, akun, order): memakai `lib/supabase/server.ts` di komponen yang dibungkus `<Suspense>`. Membaca `cookies()` di luar `<Suspense>` = **build error**. Alternatif: `"use cache: private"`.
- **Invalidasi:** Server Action → `updateTag(tag)`; Route Handler/webhook → `revalidateTag(tag, { expire: 0 })`.
- **Tag:** `products`, `product:<slug>`, `categories`.
- Rujukan: `node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md` dan `02-guides/authentication-with-cache-components.md`.

`proxy.ts` hanya me-refresh session dan melakukan redirect optimistik (belum login → `/login`). **Bukan** sarana otorisasi.

---

## 5. Pola Data

- **Baca:** fungsi di `features/<x>/queries.ts` (server) → dipanggil dari `page.tsx`. Gunakan tipe dari `types/database.types.ts`.
- **Tulis:** Server Action di `features/<x>/actions.ts`:
  1. `getUser()` → tolak jika belum login / bukan role yang sesuai,
  2. validasi Zod,
  3. panggil RPC/insert (RLS aktif),
  4. invalidasi cache: **`updateTag(tag)`** (Next 16, khusus Server Action — user langsung melihat datanya) atau `revalidatePath`,
  5. kembalikan hasil terstruktur `{ ok, data | error }`.
- **Mutasi sensitif** (order, stok): selalu lewat RPC (lihat RLS-POLICIES §6), bukan insert langsung dari app. RPC yang menerima angka uang/`profile_id` (mis. `create_order`) **hanya bisa dieksekusi service role** dan dipanggil lewat `lib/supabase/admin.ts` setelah validasi di Server Action.
- **Webhook:** Route Handler tipis → logika di `lib/midtrans` / `lib/biteship` + RPC. Invalidasi cache memakai `revalidateTag(tag, { expire: 0 })` (`updateTag` tidak tersedia di Route Handler). Pekerjaan lambat (create order Biteship) dijalankan dengan **`after()`** setelah respons 200 dikirim.

> **Next 16:** `revalidateTag(tag)` tanpa argumen kedua sudah deprecated. Cek `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/` sebelum memakai API cache.

---

## 6. Providers (`app/providers.tsx`)

Hanya provider **client** yang benar-benar dibutuhkan:

```tsx
"use client"
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      {children}
      <Toaster /> {/* Sonner */}
    </ThemeProvider>
  )
}
```
`QueryClientProvider` ditambahkan **hanya jika** TanStack Query akhirnya dipakai (lihat PRD §2). Tidak ada `AuthProvider` — session dibaca di server.

---

## 7. Konvensi

- **Penamaan file:** `kebab-case` untuk komponen/file (`product-card.tsx`), komponen React `PascalCase`.
- **Import:** dari `index.ts` feature (`@/features/cart`), bukan ke file internal feature lain.
- **Bahasa:** kode dan nama identifier Inggris; teks UI Indonesia (siapkan agar mudah dipindah ke i18n bila perlu).
- **Jangan** buat folder kosong / abstraksi "just in case". Tambah folder saat ada kode pertama yang membutuhkannya.
- **Env:** akses lewat `lib/env.ts`, bukan `process.env` tersebar.

---

## 8. Status & Langkah Setup

### Sudah
- ✅ Next.js 16.4.0 + React 19.3 + Tailwind v4 terpasang di `kenbike-baas` (template default, belum ada fitur).

### Berikutnya (urut)
- 🔲 `bun add @supabase/ssr @supabase/supabase-js zod react-hook-form @hookform/resolvers zustand sonner server-only`
- 🔲 `bunx shadcn@latest init` (pastikan alias `ui` → `@/components/ui`)
- 🔲 Buat `lib/supabase/*`, `proxy.ts`, `lib/env.ts`, `.env.example`
- 🔲 `supabase init`, tulis migrasi (enum → tabel → trigger → RLS → RPC), `supabase gen types`
- 🔲 Auth → Katalog → Cart → Alamat → Checkout → Webhook → Admin (lihat PRD §6)

---

## 9. Bacaan

- Next.js docs lokal: `node_modules/next/dist/docs/` (versi ini punya breaking changes — baca sebelum menulis kode)
- [Supabase + Next.js SSR](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [shadcn/ui](https://ui.shadcn.com/)
