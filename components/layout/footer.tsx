import Link from "next/link";

import { Container } from "./container";
import { NAV_LINKS } from "./nav-links";

const INFO_LINKS = [
  { href: "/about", label: "Tentang Kami" },
  { href: "/contact", label: "Kontak" },
  { href: "/terms", label: "Syarat & Ketentuan" },
  { href: "/privacy", label: "Kebijakan Privasi" },
  { href: "/returns", label: "Pengembalian & Refund" },
] as const;

export function Footer() {
  return (
    <footer className="mt-auto border-t bg-muted/30">
      <Container className="grid gap-8 py-10 sm:grid-cols-3">
        <div className="space-y-2">
          <p className="text-lg font-bold">KenBike</p>
          <p className="text-sm text-muted-foreground">
            Sepeda, sparepart, dan aksesoris — dikirim ke seluruh Indonesia.
          </p>
        </div>
        <FooterColumn title="Belanja" links={NAV_LINKS} />
        <FooterColumn title="Informasi" links={INFO_LINKS} />
      </Container>
      <Container className="border-t py-4 text-xs text-muted-foreground">
        KenBike. Semua hak dilindungi.
      </Container>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: readonly { href: string; label: string }[];
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold">{title}</p>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="hover:text-foreground">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
