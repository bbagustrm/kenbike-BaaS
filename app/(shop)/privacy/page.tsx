import type { Metadata } from "next";
import Link from "next/link";

import { InfoPage } from "@/components/shared/info-page";

export const metadata: Metadata = {
  title: "Kebijakan Privasi",
  description: "Bagaimana KenBike mengumpulkan, memakai, dan melindungi data pribadimu.",
};

export default function PrivacyPage() {
  return (
    <InfoPage title="Kebijakan Privasi" updatedAt="14 Oktober 2026">
      <p>
        KenBike menghormati privasimu dan memproses data pribadi sesuai Undang-Undang Nomor 27 Tahun
        2022 tentang Pelindungan Data Pribadi.
      </p>

      <h2>Data yang kami kumpulkan</h2>
      <ul>
        <li>Data akun: nama, email, nomor HP, dan foto profil (bila masuk dengan Google).</li>
        <li>Alamat pengiriman yang kamu simpan di buku alamat.</li>
        <li>Riwayat pesanan, isi keranjang, dan status pembayaran/pengiriman.</li>
        <li>
          Keranjang tamu disimpan di perangkatmu (localStorage) dan dipindahkan ke akun saat kamu
          masuk.
        </li>
      </ul>

      <h2>Untuk apa data dipakai</h2>
      <ul>
        <li>Memproses pesanan, pembayaran, dan pengiriman.</li>
        <li>Menghubungimu terkait pesanan (mis. konfirmasi atau kendala pengiriman).</li>
        <li>Keamanan akun dan pencegahan penipuan.</li>
      </ul>
      <p>Kami tidak menjual data pribadimu.</p>

      <h2>Pihak ketiga yang memproses data</h2>
      <ul>
        <li>
          <strong>Supabase</strong> — penyimpanan data dan autentikasi akun.
        </li>
        <li>
          <strong>Midtrans</strong> — pemrosesan pembayaran. Data kartu/rekening dimasukkan langsung
          di halaman Midtrans dan tidak disimpan oleh KenBike.
        </li>
        <li>
          <strong>Biteship</strong> dan kurir — nama, nomor HP, dan alamat penerima untuk
          pengiriman.
        </li>
        <li>
          <strong>Google</strong> — bila kamu memilih masuk dengan Google.
        </li>
      </ul>

      <h2>Penyimpanan dan keamanan</h2>
      <p>
        Data disimpan di layanan cloud dengan akses terbatas. Setiap pengguna hanya bisa melihat
        data miliknya sendiri; akses admin dibatasi untuk keperluan memproses pesanan.
      </p>

      <h2>Hakmu</h2>
      <ul>
        <li>Melihat dan memperbarui data akun serta alamat di halaman Akun.</li>
        <li>Meminta salinan atau penghapusan data akunmu.</li>
        <li>
          Riwayat pesanan yang sudah dibayar dapat tetap kami simpan sesuai kewajiban pencatatan
          transaksi.
        </li>
      </ul>
      <p>
        Untuk permintaan terkait data pribadi, hubungi kami lewat halaman{" "}
        <Link href="/contact">Kontak</Link>.
      </p>

      <h2>Cookie</h2>
      <p>
        Kami memakai cookie yang diperlukan untuk menjaga sesi login. Kami tidak memakai cookie
        iklan.
      </p>
    </InfoPage>
  );
}
