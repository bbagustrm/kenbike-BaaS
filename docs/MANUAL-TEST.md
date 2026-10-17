# Panduan test manual (lokal, sandbox)

Dijalankan sebelum deploy ke Vercel. Semua memakai project Supabase **dev**, Midtrans **sandbox**,
dan Biteship **test key**. Tidak ada uang/kurir sungguhan.

## 0. Persiapan

1. `.env.local` terisi (Supabase dev, `MIDTRANS_SERVER_KEY` + `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`
   sandbox, `MIDTRANS_IS_PRODUCTION=false`, `BITESHIP_API_KEY` test, `BITESHIP_WEBHOOK_SECRET`).
2. Jalankan `bun run dev` → http://localhost:3000.
3. Siapkan **2 akun**: admin (role `admin`) dan pembeli biasa. Gunakan 2 browser / jendela
   incognito agar sesi tidak tercampur.
4. Admin → **Pengaturan toko** sudah berisi alamat asal, telepon, email kontak.
5. Minimal 1 produk aktif dengan stok > 0 dan berat terisi (ongkir butuh berat).
6. **Webhook (opsional tapi disarankan):** jalankan tunnel `cloudflared tunnel --url http://localhost:3000`,
   lalu isi URL-nya di:
   - Midtrans sandbox → Settings → Payment → Notification URL: `https://<tunnel>/api/webhooks/midtrans`
   - Biteship → Webhook: `https://<tunnel>/api/webhooks/biteship` (header `x-kenbike-webhook-secret`)

   Tanpa tunnel, status pembayaran tetap tersinkron saat kembali ke `/checkout/finish` atau lewat
   tombol **Cek status Midtrans** di admin — tapi jalur webhook tidak teruji.

Data uji Midtrans sandbox:

| Metode                         | Data                                                                                                           |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Kartu sukses                   | `4811 1111 1111 1114`, CVV `123`, exp bulan/tahun mana pun di masa depan, OTP `112233`                         |
| Kartu ditolak                  | `4911 1111 1111 1113`                                                                                          |
| Virtual Account / QRIS / GoPay | Bayar lewat simulator: https://simulator.sandbox.midtrans.com (pilih bank/metode, tempel nomor VA atau URL QR) |

Tandai tiap baris: ✅ sesuai, ❌ tidak (catat langkah + screenshot).

## 1. Akun & auth

- [ ] Daftar akun baru → email konfirmasi diterima → link membuka situs dalam keadaan login.
- [ ] Login email/password, logout, login Google.
- [ ] Lupa password → email reset → ganti password → login dengan password baru.
- [ ] Akun pembeli membuka `/admin` → ditolak/di-redirect.

## 2. Katalog

- [ ] Beranda & `/products` tampil; filter kategori, pencarian, sort berfungsi.
- [ ] Detail produk: ganti varian → carousel gambar, label & deskripsi varian ikut berubah.
- [ ] Varian stok 0 tidak bisa ditambahkan ke keranjang.

## 3. Keranjang

- [ ] **Tamu:** tambah 2 produk → refresh → keranjang tetap ada (localStorage).
- [ ] Tombol di drawer berbunyi **"Masuk untuk checkout"**.
- [ ] Login dengan akun yang keranjang DB-nya **kosong** → isi keranjang tamu pindah ke akun.
- [ ] Logout, isi keranjang tamu lain, login dengan akun yang keranjangnya **tidak kosong** →
      keranjang akun yang tampil, keranjang tamu diabaikan.
- [ ] Ubah jumlah melebihi stok → ditolak dengan pesan jelas.
- [ ] Drawer terbuka: tidak ada celah di kanan, halaman di belakang tidak ikut scroll.

## 4. Alamat

- [ ] Akun tanpa alamat klik **Checkout** → diarahkan ke `/account/addresses`.
- [ ] Tambah alamat dengan **label & catatan kosong** → tersimpan (tidak muncul "Periksa kembali").
- [ ] Tambah alamat kedua, jadikan utama → hanya satu alamat bertanda utama.
- [ ] Hapus alamat utama → alamat lain otomatis menjadi utama.

## 5. Checkout & pembayaran

- [ ] `/checkout`: pilih alamat → daftar kurir & ongkir muncul; ganti alamat → ongkir dihitung ulang.
- [ ] Total = subtotal + ongkir; link Syarat & Ketentuan terbuka.
- [ ] **Bayar dengan kartu sukses** → kembali ke `/checkout/finish` → status **Pembayaran diterima**,
      keranjang kosong, stok produk berkurang.
- [ ] **Virtual Account:** buat order, tutup popup Snap tanpa bayar → pesanan berstatus
      **Menunggu pembayaran** di `/account/orders` → **Bayar** lagi dari detail pesanan → bayar di
      simulator → status berubah menjadi diterima (via webhook, atau setelah membuka halaman pesanan).
- [ ] **Kartu ditolak** → pesanan tetap menunggu pembayaran, bisa dicoba ulang.
- [ ] **Batalkan** pesanan yang masih menunggu pembayaran → status Dibatalkan, stok kembali.
- [ ] Pesanan **lunas** yang belum diambil kurir → **Batalkan pesanan**: pilih alasan **dan isi
      rekening tujuan** (wajib) → status **Menunggu refund**, order Biteship ikut batal, stok kembali,
      panel **Refund** menampilkan rekening (bisa diubah) → admin menyelesaikan refund → pembeli
      melihat **Refund selesai** + bukti.
- [ ] Setelah kurir mengambil paket (webhook `picked`), tombol **Batalkan pesanan** hilang.
- [ ] Klik "Bayar" / cek ongkir berkali-kali dengan cepat → akhirnya muncul pesan rate limit
      (bukan error 500).

## 6. Pengiriman (Biteship)

- [ ] Setelah pembayaran diterima, admin → detail pesanan menampilkan pengiriman **Diproses**
      (order Biteship terbentuk). Bila gagal: pesanan bertanda **Perlu tindakan** + tombol
      **Buat pengiriman**.
- [ ] Simulasikan update kurir (test key Biteship tidak bergerak sendiri). Ambil ID order Biteship
      di Supabase SQL Editor:

      ```sql
      select o.order_number, s.biteship_order_id
      from shipments s join orders o on o.id = s.order_id
      order by s.created_at desc limit 5;
      ```

      lalu kirim event (ganti `<ID>` dan `<SECRET>`; tanpa tunnel gunakan `http://localhost:3000`):

      ```bash
      curl -X POST http://localhost:3000/api/webhooks/biteship -H "content-type: application/json" -H "x-kenbike-webhook-secret: <SECRET>" -d '{"event":"order.status","order_id":"<ID>","status":"picked","courier_waybill_id":"WB123"}'
      ```

      Ulangi dengan `"status":"delivered"`.

- [ ] Pembeli → detail pesanan → **Unduh invoice** menghasilkan PDF A4; pesanan yang belum dibayar
      tidak punya tombol invoice, dan membuka `/api/orders/<nomor pesanan orang lain>/invoice` → 404.
- [ ] Pembeli → detail pesanan: timeline berubah menjadi **Dikirim** lalu **Selesai**; nomor resi tampil.
- [ ] Kirim event yang sama dua kali → respons `"outcome":"duplicate"`, timeline tidak dobel.
- [ ] Secret salah → `401`.

## 7. Admin

- [ ] Produk: buat produk baru (dengan varian & gambar) → kembali ke `/admin/products`; edit, nonaktifkan.
- [ ] Kategori: tambah, ubah, hapus (kategori yang dipakai produk ditolak).
- [ ] Pesanan: filter status & pencarian nomor pesanan/nama; tambahkan **catatan internal**.
- [ ] Pesanan lunas yang belum diambil kurir → **Batalkan & refund** (pilih alasan; coba sekali
      dengan "Kembalikan stok" dimatikan) → status **Menunggu refund**, order Biteship ikut batal,
      stok kembali (atau tetap bila dimatikan), panel **Refund** muncul.
- [ ] Panel Refund → **Isi data rekening** (nomor dengan spasi/strip diterima) → **Selesaikan refund**
      dengan unggah bukti (gambar/PDF) → status **Dana dikembalikan**, link bukti terbuka.
- [ ] Pesanan yang dibatalkan admin & rekening belum diisi → tombol **Selesaikan refund** nonaktif;
      admin bisa **Isi data rekening** sendiri (dari chat). Tanpa bukti & tanpa catatan → ditolak;
      hanya catatan → diterima.
- [ ] Dashboard: kartu **Menunggu refund** menghitung pesanan tadi; filter **Menunggu refund** di daftar pesanan.
- [ ] Pesanan yang sudah dikirim: tombol **Batalkan & refund** tidak muncul.
- [ ] **Selesaikan** tanda "Perlu tindakan".
- [ ] Pengguna: daftar & pencarian tampil.
- [ ] Detail pesanan dibayar → **Unduh invoice** (PDF A4, cap LUNAS, SKU tampil) dan **Unduh resi**
      (barcode nomor resi / nomor pesanan). Coba tiap ukuran di menu ▾ (100×150, 100×100, roll 80,
      roll 58) dan **Ukuran kustom…**; ukuran terakhir diingat setelah refresh.
- [ ] Pesanan belum dibayar / dibatalkan: tombol resi tidak muncul.
- [ ] Dashboard: angka penjualan dan grafik sesuai pesanan uji; kartu **Job terjadwal** menampilkan
      `expire-pending-orders` & `cleanup-rate-limits` tanpa kegagalan.
- [ ] Pengaturan toko: ubah telepon/email → halaman `/contact` ikut berubah.

## 8. Kedaluwarsa otomatis

- [ ] Buat pesanan dan biarkan tidak dibayar melewati batas waktunya (atau set `expires_at` pesanan
      uji ke masa lalu lewat SQL Editor) → dalam ±1 menit job cron mengubahnya menjadi
      Kedaluwarsa dan stok kembali.

## 9. Halaman publik & tampilan

- [ ] Tentang Kami, Kontak (link WhatsApp & email), S&K, Privasi, Pengembalian terbuka dari footer.
- [ ] Coba di lebar HP (DevTools → 375 px): header, drawer keranjang, checkout, admin tidak
      terpotong/scroll horizontal.
- [ ] Toast muncul di atas tengah; semua tombol memakai kursor tangan.
- [ ] DevTools → Console: tidak ada error CSP (`Refused to load…`) saat membuka Snap dan gambar produk.

## Setelah selesai

Batalkan/hapus pesanan uji bila perlu, dan laporkan baris ❌ (langkah, hasil yang diharapkan, hasil
sebenarnya). Lalu lanjut ke `docs/GO-LIVE.md` langkah 1 (Vercel).
