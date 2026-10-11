# KenBike

E-commerce sepeda & aksesoris berbasis **Next.js 16** (App Router) dengan **Supabase** sebagai backend (Postgres, Auth, Storage, RLS, RPC). Pembayaran via **Midtrans Snap**, pengiriman via **Biteship**.

Satu aplikasi: UI, Server Actions, dan webhook berada di repo ini — tidak ada backend terpisah.

## Dokumentasi

| Dokumen | Isi |
|---|---|
| [docs/PRD.md](docs/PRD.md) | Scope MVP, alur checkout, model stok, state machine order |
| [docs/ERD-ecommerce.dbml](docs/ERD-ecommerce.dbml) | Skema database (paste ke [dbdiagram.io](https://dbdiagram.io)) |
| [docs/RLS-POLICIES.md](docs/RLS-POLICIES.md) | Row Level Security & RPC per tabel |
| [docs/FE-STRUCTURE-FOLDER.md](docs/FE-STRUCTURE-FOLDER.md) | Struktur folder, pola data & caching |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Urutan kerja per milestone |

Status pekerjaan: [GitHub Project](https://github.com/users/bbagustrm/projects/11).

## Tech Stack

Next.js 16.4 · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui · Supabase (`@supabase/ssr`) · Zod · React Hook Form · Zustand · Sonner · Vitest · bun

## Setup Lokal

Prasyarat: [bun](https://bun.sh) ≥ 1.3, Node ≥ 20, Docker Desktop (untuk Supabase lokal, mulai M1).

```bash
bun install
cp .env.example .env.local   # lalu isi nilainya
bun dev
```

Buka http://localhost:3000.

## Scripts

| Script | Fungsi |
|---|---|
| `bun dev` | Development server |
| `bun run build` | Build produksi |
| `bun run lint` | ESLint |
| `bun run typecheck` | Pemeriksaan TypeScript |
| `bun run test` | Unit test (Vitest) |
| `bun run format` / `format:check` | Prettier |

## Konvensi Kontribusi

- **Branch:** `<type>/<issue>-<slug>`, mis. `feat/31-create-order-rpc`, `chore/m0-foundation`.
- **Commit:** [Conventional Commits](https://www.conventionalcommits.org/) — `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`; sertakan nomor issue (`(#12)`).
- **PR:** satu PR menutup issue terkait (`Closes #12`), wajib CI hijau sebelum merge.
- **Next.js 16** punya breaking changes — baca `node_modules/next/dist/docs/` sebelum memakai API Next (lihat [AGENTS.md](AGENTS.md)).
