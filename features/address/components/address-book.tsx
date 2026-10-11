"use client";

import { MapPinIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";

import { deleteAddress, setDefaultAddress } from "../actions";
import { type Address, MAX_ADDRESSES } from "../types";
import { AddressFormDialog } from "./address-form-dialog";

/**
 * Buku alamat di /account/addresses. `nextPath` (mis. "/checkout") diisi bila
 * user diarahkan ke sini karena belum punya alamat: setelah alamat pertama
 * tersimpan, user langsung dikembalikan ke sana.
 */
export function AddressBook({
  addresses,
  nextPath,
}: {
  addresses: Address[];
  nextPath: string | null;
}) {
  const router = useRouter();
  const full = addresses.length >= MAX_ADDRESSES;
  const afterSave = nextPath ? () => router.push(nextPath) : undefined;

  const addButton = (
    <AddressFormDialog
      trigger={<Button disabled={full} />}
      triggerLabel={
        <>
          <PlusIcon />
          Tambah alamat
        </>
      }
      onSaved={afterSave}
    />
  );

  if (addresses.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <MapPinIcon />
          </EmptyMedia>
          <EmptyTitle>Belum ada alamat</EmptyTitle>
          <EmptyDescription>
            Tambahkan alamat pengiriman untuk bisa checkout. Kamu bisa menyimpan lebih dari satu
            alamat.
          </EmptyDescription>
        </EmptyHeader>
        {addButton}
      </Empty>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {addresses.length} dari {MAX_ADDRESSES} alamat
        </p>
        {addButton}
      </div>
      <ul className="grid gap-4 md:grid-cols-2">
        {addresses.map((address) => (
          <li key={address.id}>
            <AddressCard address={address} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function AddressCard({ address }: { address: Address }) {
  const [pending, startTransition] = useTransition();
  const makeDefault = () =>
    startTransition(async () => {
      const result = await setDefaultAddress(address.id);
      if (result.status === "error") toast.error(result.message);
      else toast.success(result.message);
    });

  return (
    <Card className={cn("h-full", address.isDefault && "ring-2 ring-primary")}>
      <CardContent className="flex h-full flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">{address.label ?? address.recipientName}</p>
            {address.isDefault && <Badge>Utama</Badge>}
          </div>
          <div className="flex shrink-0 items-center">
            <AddressFormDialog
              address={address}
              trigger={<Button variant="ghost" size="icon-sm" aria-label="Ubah alamat" />}
              triggerLabel={<PencilIcon />}
            />
            <ConfirmDialog
              trigger={<Button variant="ghost" size="icon-sm" aria-label="Hapus alamat" />}
              triggerLabel={<Trash2Icon />}
              title="Hapus alamat ini?"
              description={
                address.isDefault
                  ? "Ini alamat utama. Alamat terbaru lainnya akan otomatis menjadi alamat utama."
                  : "Alamat akan dihapus dari buku alamatmu."
              }
              confirmLabel="Hapus"
              destructive
              onConfirm={() => deleteAddress(address.id)}
            />
          </div>
        </div>

        <div className="flex-1 space-y-1 text-sm">
          <p>
            {address.recipientName} · <span className="text-muted-foreground">{address.phone}</span>
          </p>
          <p className="text-muted-foreground">{address.addressLine}</p>
          {address.area ? (
            <p className="text-muted-foreground">{address.area.label}</p>
          ) : (
            <p className="font-medium text-destructive">
              Kecamatan belum dipilih — ubah alamat ini agar bisa dipakai kirim.
            </p>
          )}
          {address.note && <p className="text-xs text-muted-foreground">Catatan: {address.note}</p>}
        </div>

        {!address.isDefault && (
          <Button
            variant="outline"
            size="sm"
            className="self-start"
            disabled={pending}
            onClick={makeDefault}
          >
            Jadikan utama
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
