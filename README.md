# KenBike

E-commerce sepeda & aksesoris berbasis **Next.js 16** (App Router) dengan **Supabase** sebagai backend (Postgres, Auth, Storage, RLS, RPC). Pembayaran via **Midtrans Snap**, pengiriman via **Biteship**.

Satu aplikasi: UI, Server Actions, dan webhook berada di repo ini — tidak ada backend terpisah.

## Dokumentasi

| Dokumen                                                    | Isi                                                            |
| ---------------------------------------------------------- | -------------------------------------------------------------- |
| [docs/PRD.md](docs/PRD.md)                                 | Scope MVP, alur checkout, model stok, state machine order      |
| [docs/ERD-ecommerce.dbml](docs/ERD-ecommerce.dbml)         | Skema database (paste ke [dbdiagram.io](https://dbdiagram.io)) |
| [docs/RLS-POLICIES.md](docs/RLS-POLICIES.md)               | Row Level Security & RPC per tabel                             |
| [docs/FE-STRUCTURE-FOLDER.md](docs/FE-STRUCTURE-FOLDER.md) | Struktur folder, pola data & caching                           |
| [docs/ROADMAP.md](docs/ROADMAP.md)                         | Urutan kerja per milestone                                     |

Status pekerjaan: [GitHub Project](https://github.com/users/bbagustrm/projects/11).

## Tech Stack

Next.js 16.4 · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui · Supabase (`@supabase/ssr`) · Zod · React Hook Form · Zustand · Sonner · Vitest · bun

## Setup Lokal

Prasyarat: [bun](https://bun.sh) ≥ 1.3, Node ≥ 20, akun Supabase. Docker **tidak** diperlukan — development memakai project Supabase **dev** di cloud.

```bash
bun install
cp .env.example .env.local   # lalu isi nilainya
bun dev
```

Buka http://localhost:3000.

### Database (Supabase)

1. Buat project Supabase khusus dev (region Singapore). Saat membuat: **Data API ON**, **"Automatically expose new tables" OFF**, **automatic RLS ON**.
2. Login & tautkan CLI (password database diketik sendiri saat diminta):
   ```bash
   bunx supabase login
   bunx supabase link --project-ref <project-ref>
   ```
3. Terapkan skema + seed (menghapus isi DB dev): `bun run db:reset`
4. Verifikasi: `bun run db:test` dan `bun run db:advisors`
5. Setelah mengubah skema: tambah file di `supabase/migrations/`, lalu `bun run db:push` dan `bun run db:types`.

Admin pertama: daftar seperti user biasa, lalu di SQL Editor Supabase jalankan
`update public.profiles set role = 'admin' where id = '<uuid user>';`

### Pembayaran & pengiriman (sandbox)

**Midtrans** (Dashboard Sandbox → Settings → Configuration):

| Field                                  | Nilai                                    |
| -------------------------------------- | ---------------------------------------- |
| Payment Notification URL               | `https://<domain>/api/webhooks/midtrans` |
| Finish / Unfinish / Error Redirect URL | `https://<domain>/checkout/finish`       |

Bayar uji coba lewat [Midtrans Simulator](https://simulator.sandbox.midtrans.com) (VA, QRIS, dll.).

**Biteship** (Dashboard → Integrasi → For Developers → Webhook): URL `https://<domain>/api/webhooks/biteship`, event `order.status` & `order.waybill_id`, **Headers Signature Key** `x-kenbike-webhook-secret`, **Headers Signature Secret** = isi `BITESHIP_WEBHOOK_SECRET` (nilai acak buatanmu sendiri).

**Tes lokal:** webhook butuh URL publik HTTPS — jalankan tunnel lalu pakai URL-nya sebagai `<domain>`:

```bash
cloudflared tunnel --url http://localhost:3000
```

Tanpa tunnel pun status pembayaran tetap diperbarui: halaman `/checkout/finish` menanyakan Status API Midtrans setiap 15 detik (logika sama dengan webhook).

### Keamanan & operasional

- **Security headers** (CSP, HSTS, X-Frame-Options, dll.) didefinisikan di `next.config.ts`; HSTS & `upgrade-insecure-requests` hanya bila `NEXT_PUBLIC_SITE_URL` https.
- **Rate limit** Server Action sensitif (checkout, cek ongkir, cari area, bayar ulang): `lib/rate-limit.ts` → RPC `check_rate_limit`.
- **Log terstruktur** (`lib/log.ts`): satu baris JSON per event, data sensitif disamarkan. Alert opsional ke Discord lewat `OPS_DISCORD_WEBHOOK_URL`.
- Checklist go-live: [docs/GO-LIVE.md](docs/GO-LIVE.md).

## Scripts

| Script                            | Fungsi                                             |
| --------------------------------- | -------------------------------------------------- |
| `bun dev`                         | Development server                                 |
| `bun run build`                   | Build produksi                                     |
| `bun run lint`                    | ESLint                                             |
| `bun run typecheck`               | Pemeriksaan TypeScript                             |
| `bun run test`                    | Unit test (Vitest)                                 |
| `bun run format` / `format:check` | Prettier                                           |
| `bun run db:push`                 | Terapkan migrasi baru ke project linked            |
| `bun run db:reset`                | Reset DB linked: semua migrasi + seed (destruktif) |
| `bun run db:types`                | Generate `types/database.types.ts`                 |
| `bun run db:test`                 | Tes RLS & RPC (`supabase/tests`, di-rollback)      |
| `bun run db:advisors`             | Security & Performance Advisor                     |

## Konvensi Kontribusi

- **Branch:** `<type>/<issue>-<slug>`, mis. `feat/31-create-order-rpc`, `chore/m0-foundation`.
- **Commit:** [Conventional Commits](https://www.conventionalcommits.org/) — `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`; sertakan nomor issue (`(#12)`).
- **PR:** satu PR menutup issue terkait (`Closes #12`), wajib CI hijau sebelum merge.
- **Next.js 16** punya breaking changes — baca `node_modules/next/dist/docs/` sebelum memakai API Next (lihat [AGENTS.md](AGENTS.md)).
