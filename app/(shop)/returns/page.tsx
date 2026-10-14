import type { Metadata } from "next";
import Link from "next/link";

import { InfoPage } from "@/components/shared/info-page";

export const metadata: Metadata = {
  title: "Pengembalian & Refund",
  description: "Kebijakan pembatalan, pengembalian barang, dan refund di KenBike.",
};

export default function ReturnsPage() {
  return (
    <InfoPage title="Pengembalian & Refund" updatedAt="14 Oktober 2026">
      <h2>Pembatalan pesanan</h2>
      <ul>
        <li>
          Pesanan yang <strong>belum dibayar</strong> dapat kamu batalkan sendiri dari halaman
          pesanan, atau otomatis kedaluwarsa setelah 24 jam.
        </li>
        <li>
          Pesanan yang <strong>sudah dibayar</strong> tetapi belum dikirim dapat dibatalkan dengan
          menghubungi kami; dana dikembalikan penuh.
        </li>
      </ul>

      <h2>Pengembalian barang</h2>
      <p>Kami menerima pengembalian bila:</p>
      <ul>
        <li>
          Barang rusak saat diterima, cacat produksi, atau tidak sesuai pesanan (varian/ukuran
          salah).
        </li>
        <li>
          Pengajuan dilakukan maksimal <strong>7 hari</strong> sejak paket diterima.
        </li>
        <li>
          Disertai <strong>video unboxing</strong> utuh tanpa jeda sejak paket masih tersegel, dan
          foto kerusakan.
        </li>
        <li>Barang belum dipakai dan kemasan serta kelengkapan masih ada.</li>
      </ul>
      <p>
        Pengembalian tidak berlaku untuk perubahan pikiran atau salah pilih ukuran oleh pembeli.
      </p>

      <h2>Cara mengajukan</h2>
      <ol>
        <li>
          Hubungi kami lewat halaman <Link href="/contact">Kontak</Link> dengan nomor pesanan, foto,
          dan video unboxing.
        </li>
        <li>Kami memeriksa pengajuan dan memberi instruksi pengiriman balik bila disetujui.</li>
        <li>Ongkir pengembalian ditanggung KenBike untuk barang rusak, cacat, atau salah kirim.</li>
      </ol>

      <h2>Refund</h2>
      <ul>
        <li>
          Refund diberikan setelah barang kembali dan diperiksa, atau barang diganti dengan yang
          sesuai.
        </li>
        <li>
          Dana dikembalikan melalui metode pembayaran semula (lewat Midtrans) atau transfer bank,
          dalam <strong>14 hari kerja</strong> setelah disetujui.
        </li>
        <li>
          Bila pembayaranmu tercatat dobel, atau masuk setelah pesanan kedaluwarsa dan stok habis,
          kami akan menghubungimu dan mengembalikan dananya penuh.
        </li>
      </ul>
    </InfoPage>
  );
}
