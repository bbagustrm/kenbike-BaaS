# Panduan uji manual lengkap (lokal, sandbox)

Dijalankan sebelum rilis `dev` → `main` dan deploy ke Vercel. Semua memakai Supabase **dev**,
Midtrans **sandbox**, Biteship **test key**, dan Resend dengan pengalihan email — tidak ada uang,
kurir, atau email pembeli sungguhan.

**Cara memakai dokumen ini**

- Setiap kasus punya **ID** (mis. `PAY-03`). Tulis hasil di kotak: `[x]` lolos, `[!]` gagal.
- Format: **langkah** → _hasil yang diharapkan_.
- Kerjakan **§1 Skenario cepat** dulu (±30 menit). Bila lolos, lanjut per bagian §2–§20.
- Untuk setiap `[!]` isi template di **Lampiran C** dan kirim ke developer.
- Simbol: 👤 pembeli A · 👥 pembeli B · 🛠 admin · 👻 tamu (belum login).

---

## 0. Persiapan

### 0.1 Environment (`.env.local`)

- [ ] Supabase dev: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] `NEXT_PUBLIC_SITE_URL=http://localhost:3000`.
- [ ] Midtrans sandbox: `MIDTRANS_SERVER_KEY`, `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`, `MIDTRANS_IS_PRODUCTION=false`.
- [ ] Biteship test: `BITESHIP_API_KEY`, `BITESHIP_WEBHOOK_SECRET` (nilai acak buatan sendiri).
- [ ] Email: `RESEND_API_KEY`, `MAIL_FROM="KenBike <onboarding@resend.dev>"`,
      `MAIL_DEV_TO=<email akun Resend>`. Cek: `bun run email:test` → _"Terkirim ke … ✓", email masuk._
- [ ] Opsional: `OPS_DISCORD_WEBHOOK_URL` (alert admin), `ADMIN_NOTIFY_EMAIL`.
- [ ] Jalankan `bun run dev` → http://localhost:3000. Setelah mengubah `.env.local`, restart server.

### 0.2 Akun & browser

Pakai browser/profil terpisah agar sesi tidak tercampur:

| Peran        | Browser                | Catatan                                             |
| ------------ | ---------------------- | --------------------------------------------------- |
| 🛠 Admin      | Chrome (profil utama)  | `role = admin` (lihat Lampiran A, A1)               |
| 👤 Pembeli A | Chrome incognito       | punya alamat, dipakai untuk sebagian besar alur     |
| 👥 Pembeli B | Browser lain (Edge/FF) | dipakai untuk uji akses data orang lain & keranjang |
| 👻 Tamu      | Jendela privat baru    | tidak login                                         |

### 0.3 Data

- [ ] 🛠 **Pengaturan toko**: nama, alamat asal (pilih area Biteship), telepon, email kontak terisi.
- [ ] Produk **P1**: ≥ 2 opsi (mis. Warna × Ukuran), stok beberapa varian **2**, satu varian **0**,
      berat & dimensi terisi, ≥ 3 foto (sebagian khusus varian).
- [ ] Produk **P2**: tanpa opsi, stok ≥ 10 (untuk banyak pesanan uji).
- [ ] Produk **P3**: **pre-order** (estimasi 14 hari).
- [ ] Minimal 2 kategori (salah satu bersub-kategori).

### 0.4 Data uji pembayaran Midtrans (sandbox)

| Metode                         | Data                                                                                  |
| ------------------------------ | ------------------------------------------------------------------------------------- |
| Kartu sukses                   | `4811 1111 1111 1114`, CVV `123`, kedaluwarsa bulan/tahun di masa depan, OTP `112233` |
| Kartu ditolak                  | `4911 1111 1111 1113`                                                                 |
| Virtual Account / QRIS / GoPay | Bayar di simulator https://simulator.sandbox.midtrans.com (tempel nomor VA / URL QR)  |

### 0.5 Webhook (disarankan)

Tanpa tunnel, status pembayaran tetap tersinkron saat kembali ke `/checkout/finish`, membuka detail
pesanan, atau tombol **Cek status Midtrans** di admin — tetapi jalur webhook tidak teruji.

- `cloudflared tunnel --url http://localhost:3000` → salin URL `https://…trycloudflare.com`.
- Midtrans sandbox → Settings → Payment → Notification URL: `https://<tunnel>/api/webhooks/midtrans`.
- Status Biteship disimulasikan dengan `curl` (Lampiran B) karena test key tidak bergerak sendiri.

---

## 1. Skenario cepat (end-to-end, ±30 menit)

- [ ] **E2E-01** 👻 Tambah P1 (varian stok 2) ke keranjang → 👤 login → _keranjang tamu pindah ke akun._
- [ ] **E2E-02** 👤 Checkout → pilih kurir → bayar **kartu sukses** → _/checkout/finish "Pembayaran diterima", keranjang kosong._
- [ ] **E2E-03** 🛠 Detail pesanan → _pengiriman Diproses, order Biteship terbentuk_ → **Unduh invoice** & **Unduh resi** → _PDF terbuka._
- [ ] **E2E-04** Kirim webhook `picked` lalu `delivered` (B2) → 👤 _timeline Dikirim → Selesai, nomor resi tampil._
- [ ] **E2E-05** 👤 Buka beranda → _modal "Pesananmu sudah sampai"_ → beri ulasan 5★ + foto → _ulasan tampil di halaman P1, rating kartu katalog berubah._
- [ ] **E2E-06** 👤 Halaman P1 → Komentar → tanya → 🛠 **Komentar** → balas → _jawaban berbadge Admin di produk, email ke 👤._
- [ ] **E2E-07** 👤 Pesanan P2 lunas → **Batalkan pesanan** + isi rekening → _Menunggu refund, pesan sistem di chat, email "dibatalkan"._
- [ ] **E2E-08** 🛠 **Selesaikan refund** + bukti → 👤 _Refund selesai + bukti, email "refund sudah ditransfer"._
- [ ] **E2E-09** 👤 **Pesan baru** → 🛠 balas dengan lampiran → _👤 menerima tanpa refresh + email (bila tidak sedang membuka chat)._

---

## 2. Akun & autentikasi (AUTH)

- [ ] **AUTH-01** 👻 Daftar dengan email baru → _email konfirmasi (Supabase) diterima; link membuka situs dalam keadaan login._
- [ ] **AUTH-02** Daftar dengan email yang sudah terdaftar / password lemah / konfirmasi password beda → _pesan error jelas, tidak ada akun ganda._
- [ ] **AUTH-03** Login email/password benar → _masuk, avatar/menu akun tampil._ Password salah → _pesan error, tidak masuk._
- [ ] **AUTH-04** **Login dengan Google** → _masuk; nama & avatar dari Google tampil._
- [ ] **AUTH-05** Logout dari menu akun → _kembali sebagai tamu; keranjang akun tidak tampil._
- [ ] **AUTH-06** **Lupa password** → email reset → atur password baru → login dengan password baru → _berhasil; password lama ditolak._
- [ ] **AUTH-07** 👻 Buka `/account/orders`, `/checkout`, `/admin` → _diarahkan ke `/login?next=…`; setelah login kembali ke halaman tujuan._
- [ ] **AUTH-08** 👤 sudah login membuka `/login` atau `/register` → _diarahkan ke beranda._
- [ ] **AUTH-09** 👤 (bukan admin) membuka `/admin` → _404 (halaman admin tidak terungkap)._

## 3. Profil & alamat (ACC)

- [ ] **ACC-01** 👤 **Akun → Profil**: ubah nama & nomor HP → simpan → _toast sukses; nama baru tampil di menu akun._ Nomor HP tidak valid → _ditolak._
- [ ] **ACC-02** **Alamat**: tambah alamat pertama (cari area kelurahan/kecamatan) dengan **label & catatan kosong** → _tersimpan, otomatis Utama._
- [ ] **ACC-03** Tambah alamat kedua → **Jadikan utama** → _hanya satu berlabel Utama._
- [ ] **ACC-04** **Ubah alamat** → simpan → _perubahan tampil._ **Hapus** alamat utama → _alamat lain otomatis jadi Utama._
- [ ] **ACC-05** Field wajib kosong / kode pos bukan 5 digit → _pesan error per field._
- [ ] **ACC-06** Tab akun: **Pesanan · Pesan · Profil · Alamat** — tab aktif tersorot sesuai halaman.

## 4. Katalog & pencarian (CAT)

- [ ] **CAT-01** Beranda: hero, kategori, produk tampil; gambar termuat.
- [ ] **CAT-02** `/products`: filter **kategori** (termasuk sub-kategori), **pencarian** (navbar & halaman), rentang **harga min/maks**, **urutkan** (Terbaru, Harga terendah/tertinggi) → _hasil sesuai; URL berubah sehingga bisa dibagikan._
- [ ] **CAT-03** Kombinasi filter → **Hapus semua filter** → _kembali ke semua produk._
- [ ] **CAT-04** Paginasi (12 per halaman) → halaman berikutnya/sebelumnya benar.
- [ ] **CAT-05** Pencarian tanpa hasil → _keadaan kosong yang ramah._
- [ ] **CAT-06** Kartu produk: harga "Mulai Rp…" untuk rentang harga, badge **Pre-order** untuk P3, **★ rata-rata (jumlah)** bila sudah ada ulasan.
- [ ] **CAT-07** Produk/varian nonaktif tidak muncul di katalog maupun pencarian.

## 5. Halaman produk (PDP)

- [ ] **PDP-01** Pilih opsi varian → _harga, SKU, stok, dan galeri foto varian ikut berubah; label & deskripsi varian tampil di gambar._
- [ ] **PDP-02** Galeri: geser kiri/kanan, thumbnail, foto khusus varian berganti saat varian dipilih.
- [ ] **PDP-03** Varian stok **0** → _"Stok habis", tombol tambah ke keranjang nonaktif._ Stok sedikit → _"Sisa N unit"._
- [ ] **PDP-04** P3 pre-order → _info estimasi pengiriman ±14 hari._
- [ ] **PDP-05** Breadcrumb kategori benar dan bisa diklik.
- [ ] **PDP-06** Accordion: **Deskripsi** & **Ulasan** terbuka, **Komentar** tertutup.
- [ ] **PDP-07** **Deskripsi rich text** (setelah ADM-P-05): heading, tabel spesifikasi, daftar, link (tab baru), gambar, video YouTube tampil; di lebar HP tabel bisa di-scroll horizontal. Produk berdeskripsi lama (teks polos) → _tampil sebagai paragraf._
- [ ] **PDP-08** Rating di bawah judul (★ 4,5 · N ulasan) → klik → _menggulir ke section Ulasan._
- [ ] **PDP-09** Ulasan: ringkasan rata-rata + bar 1–5★, **2** ulasan terbaru; balasan admin menjorok berbadge **Admin**; klik foto → _lightbox dengan navigasi._
- [ ] **PDP-10** **Tampilkan semua ulasan (N)** → modal: 5 ulasan, scroll → _5 berikutnya_; filter bintang (jumlah per bintang benar), default terbaru; bintang tanpa ulasan → _keadaan kosong._
- [ ] **PDP-11** Produk tanpa ulasan → _"Belum ada ulasan…"._
- [ ] **PDP-12** **Komentar**: DevTools → Network, sebelum dibuka _tidak ada request `list_product_comments`_; dibuka → 5 komentar terbaru; scroll → 5 berikutnya.
- [ ] **PDP-13** 👻 klik kolom komentar / **Balas** → _modal "Masuk untuk berkomentar"_ → Masuk → _kembali ke `/products/<slug>#komentar`._
- [ ] **PDP-14** 👤 kirim pertanyaan → _langsung tampil paling atas._ **Balas** komentar orang lain → _balasan menjorok; balasan tidak punya tombol Balas (1 tingkat)._
- [ ] **PDP-15** Komentar kosong / > 1000 karakter → _ditolak._ Kirim > 6 komentar dalam 1 menit → _pesan rate limit._

## 6. Keranjang (CART)

- [ ] **CART-01** 👻 Tambah 2 produk → refresh → _keranjang tetap (localStorage)._ Drawer: tombol **"Masuk untuk checkout"**.
- [ ] **CART-02** 👻 login dengan akun yang keranjangnya **kosong** → _isi keranjang tamu pindah ke akun._
- [ ] **CART-03** Logout, isi keranjang tamu lain, login dengan akun yang keranjangnya **berisi** → _keranjang akun yang tampil; keranjang tamu diabaikan._
- [ ] **CART-04** Ubah jumlah (+/−), hapus item → _subtotal terhitung ulang._ Jumlah melebihi stok → _ditolak dengan pesan jelas._
- [ ] **CART-05** Drawer terbuka: _tidak ada celah di kanan; halaman belakang tidak ikut scroll; tombol berkursor tangan._
- [ ] **CART-06** 👤 tombol **Checkout** di drawer → `/checkout`.
- [ ] **CART-07** Keranjang sama di dua tab/perangkat untuk akun yang sama (refresh tab kedua).

## 7. Checkout & pembayaran (PAY)

- [ ] **PAY-01** 👤 tanpa alamat → **Checkout** → _diarahkan ke `/account/addresses`._
- [ ] **PAY-02** `/checkout`: pilih alamat → _daftar kurir & ongkir muncul_; ganti alamat → _ongkir dihitung ulang._
- [ ] **PAY-03** Ringkasan: _total = subtotal + ongkir_; catatan pembeli; link **Syarat & Ketentuan** & **Kebijakan Pengembalian** terbuka.
- [ ] **PAY-04** Bayar **kartu sukses** → _Snap tertutup, `/checkout/finish` "Pembayaran diterima", keranjang kosong, stok fisik varian berkurang (🛠 Produk)._
- [ ] **PAY-05** **Virtual Account**: buat pesanan → tutup Snap tanpa bayar → _pesanan "Menunggu pembayaran"_ → detail pesanan → **Bayar** → bayar di simulator → _status "Diproses" (webhook atau setelah membuka halaman)._
- [ ] **PAY-06** **Kartu ditolak** → _pesanan tetap Menunggu pembayaran; bisa bayar ulang._
- [ ] **PAY-07** Stok terkunci saat menunggu bayar: 👥 coba beli varian yang stoknya habis dipegang 👤 → _tidak bisa melebihi stok tersedia._
- [ ] **PAY-08** 👤 **Batalkan** pesanan yang masih menunggu bayar → _Dibatalkan, stok tersedia kembali._
- [ ] **PAY-09** Klik **Bayar** / cek ongkir berkali-kali cepat → _pesan "Terlalu banyak percobaan…", bukan error 500._
- [ ] **PAY-10** Checkout P3 pre-order → _info estimasi pre-order tampil di ringkasan & detail pesanan._

## 8. Pesanan pembeli (ORD)

- [ ] **ORD-01** `/account/orders`: daftar terbaru dulu; filter **Menunggu bayar · Diproses · Dikirim · Selesai · Dibatalkan**; paginasi.
- [ ] **ORD-02** Detail pesanan: item, harga, ongkir, total, alamat, kurir, metode bayar, **timeline status** berurutan.
- [ ] **ORD-03** **Beli lagi** (pesanan selesai/dibatalkan) → _item masuk keranjang (yang stoknya ada)._
- [ ] **ORD-04** **Unduh invoice** (pesanan lunas) → _PDF A4: data toko, nomor INV, cap LUNAS, alamat, item, total._ Pesanan belum bayar → _tidak ada tombol invoice._
- [ ] **ORD-05** Pesanan dibatalkan setelah bayar → invoice _bercap DIBATALKAN_; setelah refund selesai → _DANA DIKEMBALIKAN._
- [ ] **ORD-06** **Tanya soal pesanan** → _membuka chat pesanan; klik lagi membuka chat yang sama._

## 9. Pengiriman & webhook Biteship (SHIP)

- [ ] **SHIP-01** Setelah lunas → 🛠 detail pesanan: _pengiriman Diproses, ID Biteship tampil._ Bila gagal (mis. alamat toko kosong): _badge **Perlu tindakan** + tombol **Buat pengiriman**._
- [ ] **SHIP-02** Webhook `picked` (B2) → 👤 _timeline "Paket diambil kurir", status Dikirim, nomor resi & link lacak._
- [ ] **SHIP-03** Webhook `delivered` → _status Selesai._
- [ ] **SHIP-04** Kirim event yang sama dua kali → _respons `"outcome":"duplicate"`, timeline tidak dobel._
- [ ] **SHIP-05** Secret salah / tanpa header → _`401`._ Body tanpa `order_id` (uji koneksi dari
      dashboard Biteship) → _`200 {"ok":true}` tanpa efek._
- [ ] **SHIP-06** Event mundur (mis. `picked` setelah `delivered`) → _diabaikan, status tetap Selesai._

## 10. Pembatalan & refund — pembeli (REF-C)

- [ ] **REF-C-01** 👤 pesanan **lunas, belum diambil kurir** → **Batalkan pesanan** → pilih alasan / "Lainnya" + **isi rekening** (wajib) → _status Menunggu refund; order Biteship batal; stok kembali; panel Refund menampilkan rekening._
- [ ] **REF-C-02** Rekening tidak valid (nomor bukan angka, nama kosong) → _ditolak sebelum pesanan dibatalkan._ Nomor dengan spasi/strip → _diterima & dinormalisasi._
- [ ] **REF-C-03** Panel Refund → **Ubah rekening** → _tersimpan + pesan sistem di chat (nomor tersamar `••••1234`)._
- [ ] **REF-C-04** Setelah webhook `picked` → _tombol Batalkan pesanan hilang._
- [ ] **REF-C-05** Setelah 🛠 menyelesaikan refund → _status "Refund selesai", link bukti transfer terbuka, rekening tidak bisa diubah._
- [ ] **REF-C-06** Klik batalkan > 5 kali/menit → _pesan rate limit._

## 11. Pembatalan & refund — admin (REF-A)

- [ ] **REF-A-01** 🛠 pesanan lunas belum dikirim → **Batalkan & refund** (alasan, matikan **Kembalikan stok** sekali) → _Menunggu refund; stok tetap bila dimatikan, kembali bila dinyalakan._
- [ ] **REF-A-02** Rekening belum diisi → _tombol **Selesaikan refund** nonaktif; peringatan bila > 2 hari (A4)._ 🛠 **Isi data rekening** sendiri → _tombol aktif._
- [ ] **REF-A-03** **Selesaikan refund**: tanpa bukti & tanpa catatan → _ditolak_; unggah bukti (gambar/PDF ≤ 5 MB) → _"Dana dikembalikan", link bukti terbuka._
- [ ] **REF-A-04** Pesanan yang sudah dikirim → _tidak ada tombol Batalkan & refund._
- [ ] **REF-A-05** **Perlu tindakan** (bayar telat tanpa stok / nominal tidak cocok) → panduan menyarankan Batalkan & refund; **Selesaikan** menghapus tandanya.
- [ ] **REF-A-06** Dashboard: kartu **Menunggu refund** menghitung pesanan; daftar pesanan filter **Menunggu refund**.
- [ ] **REF-A-07** Setiap pembatalan, perubahan rekening, dan refund selesai → _pesan sistem di chat pesanan._

## 12. Chat (CHAT)

- [ ] **CHAT-01** 👤 **Akun → Pesan → Pesan baru** (topik + pesan) → _percakapan terbuka._ Topik < 3 karakter → _ditolak._
- [ ] **CHAT-02** 👻 halaman **Kontak** → link **Pesan** → login → _kembali dengan dialog Pesan baru terbuka._
- [ ] **CHAT-03** 🛠 **Pesan**: badge sidebar = percakapan butuh balasan; daftar default **Butuh balasan**; filter status/jenis; cari nama, email, topik, nomor pesanan.
- [ ] **CHAT-04** 🛠 buka percakapan → _badge berkurang, penanda belum dibaca hilang_; panel konteks: nama, email, HP, pesanan (link, status, total, refund).
- [ ] **CHAT-05** 🛠 balas teks → 👤 (halaman percakapan terbuka) _menerima tanpa refresh._ 👤 balas → 🛠 _menerima tanpa refresh, badge naik._
- [ ] **CHAT-06** Lampiran: gambar & PDF (≤ 5 file, ≤ 5 MB) → _thumbnail/link tampil di kedua sisi._ File > 5 MB / tipe lain → _ditolak._
- [ ] **CHAT-07** Enter kirim, Shift+Enter baris baru; **Muat pesan sebelumnya** pada percakapan panjang (> 40 pesan).
- [ ] **CHAT-08** 🛠 **Tandai selesai** → _hilang dari Butuh balasan; 👤 melihat "Selesai"._ 👤 membalas → _terbuka lagi._
- [ ] **CHAT-09** 🛠 detail pesanan → **Chat pembeli** → _membuka/membuat chat pesanan._
- [ ] **CHAT-10** Badge 👤 di tab **Pesan** & avatar header muncul saat ada balasan, hilang setelah dibuka.
- [ ] **CHAT-11** Tampilan HP: inbox admin satu kolom; thread tidak terpotong.

## 13. Ulasan (REV)

- [ ] **REV-01** 👤 punya pesanan Selesai → buka halaman mana pun → _modal "Pesananmu sudah sampai! 🎉" dengan produknya._
- [ ] **REV-02** **Beri ulasan**: pilih bintang (klik & panah keyboard), klik beberapa **quick text** (tersorot, teks terisi), tulis teks, unggah 1–5 foto → **Kirim ulasan** → _toast sukses._
- [ ] **REV-03** Ulasan tampil di **setiap produk** pada pesanan itu, dengan varian; rating & jumlah ulasan di halaman produk dan kartu katalog terbarui.
- [ ] **REV-04** Detail pesanan → _kartu **Ulasanmu** (read-only, tanpa tombol ubah)._
- [ ] **REV-05** Pesanan lain yang Selesai → **Nanti** → _modal tidak muncul lagi untuk pesanan itu_; tombol **Beri ulasan** tetap ada di detail pesanan. Tutup modal dengan X → _tidak muncul lagi selama sesi tab._
- [ ] **REV-06** Pesanan belum Selesai → _tidak ada tombol Beri ulasan._ Kirim tanpa bintang → _ditolak._ Foto > 5 → _ditolak._
- [ ] **REV-07** 🛠 **Ulasan**: filter belum dibalas, bintang, sumber, produk, pencarian.
- [ ] **REV-08** 🛠 **Balas** → _tampil di produk berbadge Admin_; **Ubah balasan**; kosongkan → _balasan hilang._
- [ ] **REV-09** 🛠 **Tambah ulasan** (impor Shopee): produk, nama, tanggal lampau, varian, bintang, teks, foto → _badge Impor; tampil di produk dengan tanggal aslinya; rating berubah._ Tanggal masa depan → _ditolak._
- [ ] **REV-10** 🛠 **Hapus** ulasan → _hilang dari produk; rating dihitung ulang._

## 14. Komentar — admin (CMT)

- [ ] **CMT-01** Badge sidebar **Komentar** = pertanyaan belum dijawab admin.
- [ ] **CMT-02** Daftar default **Belum dijawab** → **Balas** → _jawaban berbadge Admin di produk; pertanyaan keluar dari Belum dijawab._
- [ ] **CMT-03** **Sembunyikan** pertanyaan → _hilang dari produk, muncul di filter Disembunyikan_; **Tampilkan** → _muncul lagi._
- [ ] **CMT-04** Sembunyikan/hapus **balasan** saja → _pertanyaan tetap._ Hapus pertanyaan → _balasannya ikut terhapus._
- [ ] **CMT-05** Filter produk & pencarian (isi, nama, produk) berfungsi.

## 15. Admin — produk, kategori, stok (ADM-P)

- [ ] **ADM-P-01** **Tambah produk**: nama (slug otomatis), kategori, opsi & nilai → _matriks varian terbentuk_; harga/stok per varian & massal; berat & dimensi → **Buat produk** → _kembali ke `/admin/products`._
- [ ] **ADM-P-02** Validasi: slug ganda, SKU ganda, tanpa varian aktif, pre-order tanpa estimasi hari → _pesan error per field._
- [ ] **ADM-P-03** **Foto**: unggah beberapa, atur foto khusus varian, teks alternatif, hapus foto → _tampil di halaman produk sesuai varian._
- [ ] **ADM-P-04** **Ubah produk**: ganti harga/opsi; nonaktifkan **Tampilkan di toko** → _hilang dari katalog._
- [ ] **ADM-P-05** **Deskripsi rich text**: heading, tebal/miring/garis bawah/coret, link, daftar, kutipan, garis pemisah, **gambar** (unggah), **tabel** (tambah/hapus baris & kolom, hapus tabel), **video YouTube** (tempel link), undo/redo → simpan → _PDP-07 sesuai._ Link `javascript:` → _ditolak editor._
- [ ] **ADM-P-06** Daftar produk: dropdown aksi di kanan baris; **Lihat varian & ubah stok** → **Sesuaikan stok** (tambah/kurangi + alasan) → _stok fisik & tersedia berubah; tidak bisa negatif._
- [ ] **ADM-P-07** **Kategori**: tambah, ubah (termasuk induk), hapus; kategori yang dipakai produk → _ditolak._

## 16. Admin — pesanan & dokumen (ADM-O)

- [ ] **ADM-O-01** Daftar pesanan: filter status (termasuk **Perlu tindakan**, **Menunggu refund**), cari nomor pesanan/nama, rentang tanggal, paginasi.
- [ ] **ADM-O-02** Detail: item + SKU, pembayaran Midtrans (respons mentah), riwayat lengkap, pelanggan, pengiriman, **catatan internal** (tambah → tampil, tidak bisa diubah).
- [ ] **ADM-O-03** **Cek status Midtrans** → _status tersinkron._ **Buat pengiriman** (bila gagal) → _order Biteship terbentuk._
- [ ] **ADM-O-04** **Unduh invoice** (PDF A4, SKU tampil) & **Unduh resi** (barcode nomor resi / nomor pesanan): coba **100×150**, **100×100**, **Roll 80**, **Roll 58**, **Ukuran kustom…** → _semua satu halaman, roll tanpa sisa kertas; ukuran terakhir diingat setelah refresh._
- [ ] **ADM-O-05** Pesanan belum dibayar / pengiriman dibatalkan → _tidak ada tombol resi._

## 17. Admin — pengguna, pengaturan, dashboard (ADM)

- [ ] **ADM-01** **Pengguna**: daftar, cari nama/email, filter role; **Jadikan admin** / **Cabut admin** → _akses /admin berubah_; admin terakhir tidak bisa dicabut.
- [ ] **ADM-02** **Pengaturan toko**: ubah telepon/email/alamat asal → _halaman Kontak, invoice, & ongkir memakai data baru._
- [ ] **ADM-03** **Dashboard**: omzet hari ini/7/30 hari, antrean (Perlu tindakan, Menunggu refund, Perlu dikirim, Menunggu bayar, Dalam pengiriman) sesuai data; grafik penjualan; stok menipis; kartu **Job terjadwal** (`expire-pending-orders`, `cleanup-rate-limits`) tanpa kegagalan.
- [ ] **ADM-04** Klik kartu antrean → _daftar pesanan terfilter sesuai._
- [ ] **ADM-05** Sidebar bisa diciutkan; menu aktif tersorot; badge **Pesan** & **Komentar** tampil.

## 18. Notifikasi email (MAIL)

Di localhost semua email masuk ke `MAIL_DEV_TO`; subjek diawali `[DEV → <penerima asli>]`.

- [ ] **MAIL-01** 🛠 balas chat (👤 **tidak** sedang membuka percakapan) → _email "Balasan baru dari KenBike" + tombol buka percakapan._
- [ ] **MAIL-02** Balasan kedua dalam 15 menit → _tidak ada email kedua._ 👤 sedang membuka chat → _tidak ada email._
- [ ] **MAIL-03** 👤 mengirim pesan → _alert Discord (bila diisi) / email admin (bila `ADMIN_NOTIFY_EMAIL`)._
- [ ] **MAIL-04** Pesanan lunas dibatalkan (👤 & 🛠) → _email "Pesanan … dibatalkan"; bila rekening belum diisi ada ajakan mengisi._
- [ ] **MAIL-05** Refund selesai → _email "Refund … sudah ditransfer"._
- [ ] **MAIL-06** 🛠 membalas ulasan pembeli → _email ke pengulas._ Ulasan impor → _tidak ada email._
- [ ] **MAIL-07** 🛠 menjawab pertanyaan produk → _email ke penanya._
- [ ] **MAIL-08** Link di semua email membuka halaman yang benar (`http://localhost:3000/...`).
- [ ] **MAIL-09** Kosongkan `RESEND_API_KEY` + restart → _semua aksi di atas tetap berhasil (email hanya di log)._

## 19. Otomatis & batas laju (SYS)

- [ ] **SYS-01** Pesanan tidak dibayar melewati batas (atau A3) → _dalam ±1 menit menjadi Kedaluwarsa, stok kembali._
- [ ] **SYS-02** Bayar setelah kedaluwarsa (simulator VA lama) dengan stok masih ada → _lunas & diproses_; stok habis → _**Perlu tindakan: Bayar telat, stok habis**._
- [ ] **SYS-03** Rate limit muncul sebagai pesan ramah (checkout, ongkir, chat, ulasan, komentar, unduh PDF > 20/menit).

## 20. Keamanan & akses (SEC)

- [ ] **SEC-01** 👥 buka `/account/orders/<nomor pesanan 👤>` → _404._
- [ ] **SEC-02** 👥 buka `/api/orders/<nomor pesanan 👤>/invoice` → _404._ 👻 → _401._
- [ ] **SEC-03** 👤 buka `/api/admin/orders/<nomor>/invoice` atau `/label` → _404._
- [ ] **SEC-04** 👥 buka `/account/messages/<id percakapan 👤>` → _404._
- [ ] **SEC-05** Webhook Midtrans dengan signature salah (B3) → _`401`._ Body bukan JSON → _`400`._
- [ ] **SEC-06** Header keamanan (DevTools → Network → dokumen): `Content-Security-Policy`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` ada.
- [ ] **SEC-07** Komentar/chat/ulasan berisi `<script>alert(1)</script>` → _tampil sebagai teks, tidak dieksekusi; juga di email._

## 21. Tampilan, HP, aksesibilitas (UI)

- [ ] **UI-01** DevTools → 375 px: header, menu mobile, drawer keranjang, PDP, checkout, akun, chat, admin — _tidak terpotong, tidak scroll horizontal._
- [ ] **UI-02** Mode gelap/terang (ikon tema) di toko & admin → _kontras terbaca._
- [ ] **UI-03** Toast muncul di **atas tengah**; semua tombol berkursor tangan.
- [ ] **UI-04** Navigasi keyboard: Tab melalui header, form checkout, dialog (Esc menutup), bintang ulasan (panah).
- [ ] **UI-05** Console: _tidak ada error CSP (`Refused to…`)_ saat membuka Snap, gambar produk, video YouTube, chat (websocket Supabase).

## 22. Halaman publik & SEO (PUB)

- [ ] **PUB-01** Footer: **Tentang Kami, Kontak** (WhatsApp & email dari Pengaturan toko), **S&K, Privasi, Pengembalian** terbuka.
- [ ] **PUB-02** Judul tab & meta description setiap halaman produk sesuai.
- [ ] **PUB-03** View source halaman produk: JSON-LD `Product` dengan `offers`; `aggregateRating` bila ada ulasan.
- [ ] **PUB-04** Halaman tidak ada (`/products/tidak-ada`) → _halaman 404 yang ramah._

---

## Lampiran A — SQL bantu (Supabase → SQL Editor, project dev)

**A1. Jadikan admin**

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'email-admin@contoh.com');
```

**A2. Pesanan terbaru + ID Biteship**

```sql
select o.order_number, o.payment_status, o.shipping_status, s.biteship_order_id, s.waybill_id
from orders o left join shipments s on s.order_id = o.id
order by o.created_at desc limit 10;
```

**A3. Paksa kedaluwarsa (SYS-01)**

```sql
update public.orders set expires_at = now() - interval '1 minute'
where order_number = 'KB-…' and payment_status = 'pending_payment';
update public.stock_reservations set expires_at = now() - interval '1 minute'
where order_id = (select id from orders where order_number = 'KB-…');
```

**A4. Refund lewat 2 hari (peringatan REF-A-02)**

```sql
update public.refunds set created_at = now() - interval '3 days'
where order_id = (select id from orders where order_number = 'KB-…');
```

## Lampiran B — curl bantu

**B1.** Ganti `<SECRET>` dengan `BITESHIP_WEBHOOK_SECRET` dan `<ID>` dengan `biteship_order_id` (A2).
Tanpa tunnel pakai `http://localhost:3000`.

**B2. Status kurir Biteship**

```bash
curl -X POST http://localhost:3000/api/webhooks/biteship -H "content-type: application/json" -H "x-kenbike-webhook-secret: <SECRET>" -d '{"event":"order.status","order_id":"<ID>","status":"picked","courier_waybill_id":"WB123456","courier_link":"https://biteship.com/id/tracking"}'
```

Ulangi dengan `"status":"dropping_off"` lalu `"status":"delivered"`. Secret salah → `401` (SHIP-05).

**B3. Signature Midtrans salah (SEC-05)**

```bash
curl -X POST http://localhost:3000/api/webhooks/midtrans -H "content-type: application/json" -d '{"order_id":"KB-x","status_code":"200","gross_amount":"10000.00","signature_key":"salah","transaction_status":"settlement"}'
```

## Lampiran C — template laporan bug

```
ID kasus   : (mis. PAY-05)
Peran      : 👤 / 👥 / 🛠 / 👻   Browser & lebar layar:
Langkah    : 1. … 2. … 3. …
Diharapkan :
Sebenarnya :
Bukti      : screenshot / video / pesan error console (F12) / nomor pesanan
```

## Setelah selesai

Batalkan/hapus data uji bila perlu, kirim semua `[!]` dengan Lampiran C. Bila semua lolos:
PR rilis `dev` → `main`, lalu ikuti `docs/GO-LIVE.md`.
