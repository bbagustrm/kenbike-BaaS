import { InfoIcon } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AddressBook } from "@/features/address";
import { listMyAddresses } from "@/features/address/queries";
import { safeNextPath } from "@/lib/auth/redirect";
import { requireUser } from "@/lib/auth/session";
import { firstParam } from "@/lib/search";

export const metadata: Metadata = { title: "Alamat" };

export default function AddressesPage({ searchParams }: PageProps<"/account/addresses">) {
  return (
    <Suspense fallback={<Skeleton className="h-48 w-full" />}>
      {searchParams.then((sp) => (
        <Addresses nextPath={firstParam(sp.next) ? safeNextPath(firstParam(sp.next)) : null} />
      ))}
    </Suspense>
  );
}

async function Addresses({ nextPath }: { nextPath: string | null }) {
  await requireUser("/account/addresses");
  const addresses = await listMyAddresses();
  const shippable = addresses.some((a) => a.area);

  return (
    <div className="space-y-6">
      {nextPath === "/checkout" && !shippable && (
        <Alert>
          <InfoIcon />
          <AlertTitle>Tambahkan alamat untuk melanjutkan checkout</AlertTitle>
          <AlertDescription>
            Setelah alamat tersimpan, kamu akan langsung kembali ke halaman checkout.
          </AlertDescription>
        </Alert>
      )}
      <AddressBook addresses={addresses} nextPath={shippable ? null : nextPath} />
    </div>
  );
}
