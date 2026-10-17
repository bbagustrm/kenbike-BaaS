# Go-live checklist (M10)

Bagian kode M10 sudah ada di repo (halaman legal, security headers, rate limit, log terstruktur,
alert opsional, monitor pg_cron). Langkah di bawah dikerjakan pemilik akun di dashboard
masing-masing layanan. Centang berurutan.

## 1. Vercel (#21)

- [ ] Import repo `bbagustrm/kenbike-BaaS` → framework Next.js, **Install Command** `bun install`,
      **Root Directory** `kenbike-baas` bila repo berisi folder lain.
- [ ] Settings → Functions → **Region `sin1`** (Singapore, dekat Supabase).
- [ ] Environment **Preview** = Supabase dev, Midtrans sandbox, Biteship test (salin dari `.env.local`).
- [ ] `NEXT_PUBLIC_SITE_URL` = URL deployment (Preview: URL preview; Production: domain asli,
      **https://**). Security header HSTS & `upgrade-insecure-requests` hanya aktif bila https.
- [ ] Catat pola URL preview (mis. `https://kenbike-*-bbagustrm.vercel.app`) → tambahkan ke
      Supabase Auth → URL Configuration → Redirect URLs.

## 2. Supabase produksi (#79)

- [ ] Buat project **prod** (region Singapore). Data API ON, "Automatically expose new tables" OFF,
      automatic RLS ON — sama seperti dev.
- [ ] `bunx supabase link --project-ref <ref-prod>` lalu `bun run db:push` (semua migrasi).
- [ ] Database → Extensions: pastikan **pg_cron** aktif; cek job `expire-pending-orders` &
      `cleanup-rate-limits` muncul di dashboard admin (kartu "Job terjadwal").
- [ ] **Jangan** jalankan `seed.sql` di prod. Isi kategori/produk lewat admin.
- [ ] Admin pertama: daftar akun lewat situs, lalu di SQL Editor:
      `update public.profiles set role = 'admin' where id = '<uuid user>';`
- [ ] Admin → **Pengaturan toko**: alamat asal pengiriman, telepon, **email kontak**.
- [ ] Settings → Database → cek **backup harian / Point-in-Time Recovery** sesuai paket.

## 3. Auth (#40, #75)

- [ ] Authentication → URL Configuration: **Site URL** = domain prod; Redirect URLs:
      `https://<domain>/auth/callback`, `https://<domain>/auth/confirm`.
- [ ] Google OAuth: buat **OAuth client produksi** di Google Cloud (authorized redirect URI =
      `https://<ref-prod>.supabase.co/auth/v1/callback`), isi di Supabase → Providers → Google.
- [ ] Email templates: tempel `supabase/templates/*.html` (Bahasa Indonesia) + subject dari
      `supabase/config.toml`.
- [ ] **SMTP custom** (mis. Resend): Authentication → SMTP Settings. Tanpa ini email Supabase
      dibatasi beberapa email/jam.
- [ ] Authentication → Policies: aktifkan **Leaked password protection**; cek **Rate limits**
      (sign-in, sign-up, email) sesuai trafik.

## 4. Midtrans produksi (#79)

- [ ] Aktivasi akun Midtrans (dokumen usaha) → ambil **Production Server Key & Client Key**.
- [ ] Env Production: `MIDTRANS_SERVER_KEY`, `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`,
      `MIDTRANS_IS_PRODUCTION=true`.
- [ ] Settings → Configuration: Notification URL `https://<domain>/api/webhooks/midtrans`;
      Finish/Unfinish/Error URL `https://<domain>/checkout/finish`.

## 5. Biteship produksi (#79)

- [ ] API key **live** → `BITESHIP_API_KEY`; isi **saldo**.
- [ ] Webhook: URL `https://<domain>/api/webhooks/biteship`, event `order.status` &
      `order.waybill_id`, Headers Signature Key `x-kenbike-webhook-secret`, Secret = nilai acak
      baru → `BITESHIP_WEBHOOK_SECRET`.

## 5b. Email notifikasi — Resend (#102, #40)

- [ ] Resend → **Domains** → tambah domain toko, pasang record DNS (SPF/DKIM) sampai **Verified**.
- [ ] Env Production: `RESEND_API_KEY` (key produksi, bukan key dev), `MAIL_FROM="KenBike <halo@domaintoko.id>"`,
      **`MAIL_DEV_TO` dikosongkan** (bila terisi, semua email pembeli dialihkan ke satu inbox).
- [ ] Opsional `ADMIN_NOTIFY_EMAIL` untuk pesan pembeli baru (selain Discord).
- [ ] Supabase → Authentication → SMTP Settings: host `smtp.resend.com`, port `465`, user `resend`,
      password = API key Resend, sender = alamat `MAIL_FROM` (email login/daftar/reset password).
- [ ] Uji: `bun run email:test` (dengan env produksi di mesin lokal) atau kirim balasan chat ke akun uji.

## 6. Monitoring (#76)

- [ ] Opsional: `OPS_DISCORD_WEBHOOK_URL` (Discord → Channel → Integrations → Webhooks) untuk
      alert "pesanan perlu tindakan" & webhook gagal.
- [ ] Log: Vercel → Logs, cari `"event":"webhook.` atau `"level":"error"` (satu baris JSON per event,
      data sensitif disamarkan).
- [ ] Error tracking (Sentry) — opsional, lihat bagian 8.

## 7. Smoke test produksi

- [ ] Checkout nyata nominal kecil → status "Pembayaran diterima" → order Biteship terbentuk.
- [ ] Refund dari dashboard Midtrans → di admin: **Tandai sudah refund**.
- [ ] Cek header: `curl -sI https://<domain> | grep -i -E "content-security|strict-transport"`.
- [ ] Lighthouse mobile (Chrome DevTools → Lighthouse) untuk `/`, `/products`, detail produk,
      `/checkout`.

## 8. Opsional berikutnya

- **Sentry**: `bunx @sentry/wizard@latest -i nextjs` (membuat config & env); butuh akun Sentry.
- **E2E Playwright (#74)**: `bun add -d @playwright/test @next/playwright` lalu
  `bunx playwright install chromium`. Skenario butuh akun uji khusus di project dev.
