import type { Metadata } from "next";
import Link from "next/link";

import { InfoPage } from "@/components/shared/info-page";
import { StoreContact } from "@/components/shared/store-contact";

export const metadata: Metadata = {
  title: "Kontak",
  description: "Hubungi KenBike untuk pertanyaan produk, pesanan, atau pengembalian.",
};

export default function ContactPage() {
  return (
    <InfoPage title="Kontak" description="Ada pertanyaan soal produk atau pesanan? Hubungi kami.">
      <StoreContact />

      <h2>Chat dengan kami</h2>
      <p>
        Punya akun? Kirim pesan langsung lewat <Link href="/account/messages?new=1">Pesan</Link> —
        balasan kami muncul di akunmu. Untuk pertanyaan soal pesanan, buka chat dari detail
        pesanannya.
      </p>

      <h2>Saat menghubungi kami</h2>
      <ul>
        <li>
          Sertakan <strong>nomor pesanan</strong> (mis. KB-20261014-0001) bila pertanyaannya soal
          pesanan — nomornya ada di <Link href="/account/orders">Pesanan saya</Link>.
        </li>
        <li>Untuk barang rusak atau tidak sesuai, lampirkan foto dan video unboxing.</li>
        <li>Kami membalas pada hari kerja secepatnya.</li>
      </ul>

      <p>
        Lihat juga <Link href="/returns">Kebijakan Pengembalian &amp; Refund</Link> dan{" "}
        <Link href="/terms">Syarat &amp; Ketentuan</Link>.
      </p>
    </InfoPage>
  );
}
