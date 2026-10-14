import type { Metadata } from "next";
import Link from "next/link";

import { InfoPage } from "@/components/shared/info-page";

export const metadata: Metadata = {
  title: "Syarat & Ketentuan",
  description: "Syarat dan ketentuan berbelanja di KenBike.",
};

export default function TermsPage() {
  return (
    <InfoPage title="Syarat & Ketentuan" updatedAt="14 Oktober 2026">
      <p>
        Dengan membuat akun atau melakukan pemesanan di KenBike, kamu menyetujui syarat dan
        ketentuan berikut.
      </p>

      <h2>1. Akun</h2>
      <ul>
        <li>Kamu bertanggung jawab menjaga kerahasiaan akun dan kata sandimu.</li>
        <li>
          Data yang kamu berikan (nama, nomor HP, alamat) harus benar agar pesanan bisa dikirim.
        </li>
        <li>Kami dapat menonaktifkan akun yang digunakan untuk penipuan atau penyalahgunaan.</li>
      </ul>

      <h2>2. Produk, harga, dan stok</h2>
      <ul>
        <li>Harga dalam Rupiah (IDR) dan dapat berubah sewaktu-waktu sebelum pesanan dibuat.</li>
        <li>
          Harga dan ongkir yang berlaku adalah yang tampil saat pesanan dibuat; bila berubah di
          antara checkout dan pembayaran, kamu akan diminta memeriksa ulang ringkasan.
        </li>
        <li>Warna produk di layar dapat sedikit berbeda dengan aslinya.</li>
        <li>
          Produk <strong>pre-order</strong> dibayar di muka dan dikirim sesuai estimasi yang tertera
          di halaman produk.
        </li>
      </ul>

      <h2>3. Pemesanan dan pembayaran</h2>
      <ul>
        <li>Pesanan dibuat saat kamu menekan tombol Bayar di halaman checkout.</li>
        <li>
          Stok barang ditahan selama <strong>24 jam</strong> sejak pesanan dibuat. Bila belum
          dibayar dalam batas waktu, pesanan kedaluwarsa dan stok dilepas.
        </li>
        <li>
          Pembayaran diproses oleh Midtrans. KenBike tidak menyimpan data kartu atau rekeningmu.
        </li>
        <li>Pesanan yang belum dibayar dapat kamu batalkan sendiri dari halaman pesanan.</li>
      </ul>

      <h2>4. Pengiriman</h2>
      <ul>
        <li>Pengiriman memakai kurir pihak ketiga yang kamu pilih saat checkout.</li>
        <li>
          Estimasi waktu dari kurir bukan jaminan; keterlambatan dari kurir di luar kendali kami.
        </li>
        <li>
          Pastikan alamat dan nomor HP penerima benar; biaya kirim ulang akibat alamat salah
          ditanggung pembeli.
        </li>
      </ul>

      <h2>5. Pengembalian dan refund</h2>
      <p>
        Diatur dalam <Link href="/returns">Kebijakan Pengembalian &amp; Refund</Link>.
      </p>

      <h2>6. Hukum yang berlaku</h2>
      <p>
        Syarat ini tunduk pada hukum Republik Indonesia. Perselisihan diselesaikan secara musyawarah
        terlebih dahulu.
      </p>

      <h2>7. Perubahan</h2>
      <p>
        Kami dapat memperbarui syarat ini. Versi terbaru selalu tersedia di halaman ini dengan
        tanggal pembaruan di atas.
      </p>
    </InfoPage>
  );
}
