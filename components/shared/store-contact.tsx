import { MailIcon, MapPinIcon, MessageCircleIcon, PhoneIcon } from "lucide-react";

import { getStoreInfo, whatsappUrl } from "@/lib/store-info";

/** Kontak toko dari Pengaturan toko (cached, ikut static shell). */
export async function StoreContact() {
  const store = await getStoreInfo();
  return (
    <ul className="not-prose space-y-3 rounded-xl border p-4 text-sm">
      {store.phone && (
        <>
          <li className="flex items-center gap-3">
            <MessageCircleIcon
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <a href={whatsappUrl(store.phone)} target="_blank" rel="noopener noreferrer">
              WhatsApp {store.phone}
            </a>
          </li>
          <li className="flex items-center gap-3">
            <PhoneIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <a href={`tel:${store.phone}`}>{store.phone}</a>
          </li>
        </>
      )}
      {store.email && (
        <li className="flex items-center gap-3">
          <MailIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <a href={`mailto:${store.email}`}>{store.email}</a>
        </li>
      )}
      {store.address && (
        <li className="flex items-start gap-3">
          <MapPinIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span>{store.address}</span>
        </li>
      )}
      {!store.phone && !store.email && !store.address && (
        <li className="text-muted-foreground">Kontak toko belum diatur.</li>
      )}
    </ul>
  );
}
