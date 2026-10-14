import type { Metadata } from "next";
import Link from "next/link";

import { InfoPage } from "@/components/shared/info-page";

export const metadata: Metadata = {
  title: "Tentang Kami",
  description:
    "KenBike — toko sepeda, sparepart, dan aksesoris dengan pengiriman ke seluruh Indonesia.",
};

export default function AboutPage() {
  return (
    <InfoPage
      title="Tentang KenBike"
      description="Sepeda, sparepart, dan aksesoris pilihan — dikirim ke seluruh Indonesia."
    >
      <p>
        KenBike adalah toko sepeda online yang menyediakan sepeda, sparepart, dan aksesoris untuk
        pesepeda harian maupun hobi. Kami memilih produk yang kami percaya kualitasnya dan
        menampilkan informasi stok, varian, serta ongkos kirim secara jelas sebelum kamu membayar.
      </p>

      <h2>Kenapa belanja di KenBike</h2>
      <ul>
        <li>Stok ditampilkan langsung — barang yang sudah kamu pesan ditahan khusus untukmu.</li>
        <li>Pembayaran aman lewat Midtrans (virtual account, QRIS, e-wallet, kartu).</li>
        <li>Ongkir dihitung otomatis dari beberapa kurir; pilih yang paling cocok.</li>
        <li>Status pesanan dan nomor resi bisa dipantau dari akunmu.</li>
      </ul>

      <h2>Butuh bantuan?</h2>
      <p>
        Tim kami siap membantu soal ukuran sepeda, kompatibilitas sparepart, atau status pesanan.
        Hubungi kami lewat halaman <Link href="/contact">Kontak</Link>.
      </p>
    </InfoPage>
  );
}
