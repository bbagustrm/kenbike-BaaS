"use client";

import { MapPinIcon, PlusIcon, TruckIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Price } from "@/components/shared/price";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { type Address, AddressFormDialog } from "@/features/address";
import { CartLines, isPurchasable, markCartOrdered, subtotal, useCartStore } from "@/features/cart";
import type { ShippingRate } from "@/lib/biteship/types";
import { cn } from "@/lib/utils";

import { createOrderAndPay, getShippingRates } from "../actions";
import { openSnap } from "./snap";

type RatesState =
  | { status: "idle" }
  | { status: "ready"; key: string; rates: ShippingRate[] }
  | { status: "error"; key: string; message: string };

const rateId = (r: Pick<ShippingRate, "courierCode" | "serviceCode">) =>
  `${r.courierCode}:${r.serviceCode}`;

/**
 * Checkout satu halaman: alamat → kurir → catatan → ringkasan → Bayar.
 * Total yang tampil dikirim ke server sebagai `expectedTotal`; server menolak
 * bila hitungannya berbeda (harga/ongkir berubah).
 */
export function CheckoutForm({ addresses }: { addresses: Address[] }) {
  const router = useRouter();
  const lines = useCartStore((s) => s.lines);
  const cartPending = useCartStore((s) => s.pending);

  const shippable = addresses.filter((a) => a.area);
  const [addressId, setAddressId] = useState(
    () => (shippable.find((a) => a.isDefault) ?? shippable[0])?.id ?? "",
  );
  // Alamat terpilih bisa hilang (dihapus di tab lain) → jatuh ke alamat pertama.
  const selectedAddressId = shippable.some((a) => a.id === addressId)
    ? addressId
    : (shippable[0]?.id ?? "");

  const [rates, setRates] = useState<RatesState>({ status: "idle" });
  // Dinaikkan untuk memuat ulang ongkir (tombol "Coba lagi", total berubah).
  const [attempt, setAttempt] = useState(0);
  const reloadRates = () => setAttempt((n) => n + 1);
  const [rateKey, setRateKey] = useState("");
  const [note, setNote] = useState("");
  const [paying, startPaying] = useTransition();

  // Ongkir bergantung pada alamat & isi keranjang (berat) → hitung ulang bila berubah.
  const cartKey = (lines ?? []).map((l) => `${l.variantId}:${l.quantity}`).join(",");
  const quoteKey = `${selectedAddressId}|${cartKey}|${attempt}`;
  useEffect(() => {
    if (!selectedAddressId || !cartKey) return;
    let cancelled = false;
    getShippingRates(selectedAddressId).then((quote) => {
      if (cancelled) return;
      setRates(
        quote.ok
          ? { status: "ready", key: quoteKey, rates: quote.rates }
          : { status: "error", key: quoteKey, message: quote.message },
      );
    });
    return () => {
      cancelled = true;
    };
  }, [selectedAddressId, cartKey, quoteKey]);

  const current = rates.status !== "idle" && rates.key === quoteKey;
  const rateList = current && rates.status === "ready" ? rates.rates : [];
  const selectedRate =
    rateList.find((r) => rateId(r) === rateKey) ?? rateList[0] /* termurah */ ?? null;

  const purchasable = (lines ?? []).every(isPurchasable);
  const itemsTotal = subtotal(lines ?? []);
  const total = itemsTotal + (selectedRate?.price ?? 0);
  const canPay =
    Boolean(lines?.length) && purchasable && Boolean(selectedRate) && !cartPending && !paying;

  const pay = () =>
    startPaying(async () => {
      if (!selectedRate) return;
      const result = await createOrderAndPay({
        addressId: selectedAddressId,
        courierCode: selectedRate.courierCode,
        serviceCode: selectedRate.serviceCode,
        note: note.trim() || undefined,
        expectedTotal: total,
      });

      if (!result.ok) {
        toast.error(result.message);
        if ("reason" in result) {
          reloadRates();
        } else if (result.orderNumber) {
          // Order sudah dibuat tetapi Snap gagal → lanjutkan dari halaman pesanan.
          markCartOrdered();
          router.push(`/checkout/finish?order=${result.orderNumber}`);
        }
        return;
      }

      markCartOrdered();
      const finish = `/checkout/finish?order=${result.orderNumber}`;
      try {
        await openSnap(result.token);
      } catch {
        toast.error("Halaman pembayaran gagal dimuat. Lanjutkan dari halaman pesanan.");
      }
      router.push(finish);
    });

  if (lines !== null && lines.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>Keranjang masih kosong</EmptyTitle>
          <EmptyDescription>Tambahkan barang sebelum checkout.</EmptyDescription>
        </EmptyHeader>
        <Link href="/products" className={buttonVariants()}>
          Mulai belanja
        </Link>
      </Empty>
    );
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-2">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <MapPinIcon className="size-4" aria-hidden="true" />
                Alamat pengiriman
              </CardTitle>
              <CardDescription>Pilih alamat tujuan.</CardDescription>
            </div>
            <AddressFormDialog
              trigger={<Button variant="outline" size="sm" />}
              triggerLabel={
                <>
                  <PlusIcon />
                  Alamat baru
                </>
              }
            />
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={selectedAddressId}
              onValueChange={(v) => setAddressId(String(v))}
              aria-label="Alamat pengiriman"
              className="gap-3"
            >
              {shippable.map((a) => (
                <OptionCard key={a.id} value={a.id} checked={a.id === selectedAddressId}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{a.label ?? a.recipientName}</span>
                    {a.isDefault && <Badge variant="secondary">Utama</Badge>}
                  </div>
                  <p className="text-sm">
                    {a.recipientName} · {a.phone}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {a.addressLine}, {a.area?.label}
                  </p>
                </OptionCard>
              ))}
            </RadioGroup>
            <Link
              href="/account/addresses"
              className="mt-3 inline-block text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              Kelola alamat
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TruckIcon className="size-4" aria-hidden="true" />
              Kurir
            </CardTitle>
            <CardDescription>Ongkir dihitung dari berat & ukuran paket.</CardDescription>
          </CardHeader>
          <CardContent>
            {!current ? (
              <div className="space-y-3" aria-busy="true">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : rates.status === "error" ? (
              <div className="space-y-3">
                <p className="text-sm text-destructive">{rates.message}</p>
                <Button variant="outline" size="sm" onClick={reloadRates}>
                  Coba lagi
                </Button>
              </div>
            ) : (
              <RadioGroup
                value={selectedRate ? rateId(selectedRate) : ""}
                onValueChange={(v) => setRateKey(String(v))}
                aria-label="Layanan kurir"
                className="gap-3"
              >
                {rateList.map((r) => (
                  <OptionCard
                    key={rateId(r)}
                    value={rateId(r)}
                    checked={selectedRate !== null && rateId(r) === rateId(selectedRate)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">
                        {r.courierName} {r.serviceName}
                      </span>
                      <Price min={r.price} className="text-sm" />
                    </div>
                    <p className="text-sm text-muted-foreground">Estimasi {r.duration}</p>
                  </OptionCard>
                ))}
              </RadioGroup>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Barang</CardTitle>
          </CardHeader>
          <CardContent>
            {lines === null ? <Skeleton className="h-24 w-full" /> : <CartLines lines={lines} />}
          </CardContent>
        </Card>
      </div>

      <Card className="lg:sticky lg:top-20">
        <CardHeader>
          <CardTitle>Ringkasan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field>
            <FieldLabel htmlFor="note">Catatan untuk penjual (opsional)</FieldLabel>
            <Textarea
              id="note"
              rows={2}
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd>
                <Price min={itemsTotal} className="font-normal" />
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Ongkir</dt>
              <dd>
                {selectedRate ? <Price min={selectedRate.price} className="font-normal" /> : "—"}
              </dd>
            </div>
            <div className="flex justify-between border-t pt-2 text-base">
              <dt className="font-medium">Total</dt>
              <dd>
                <Price min={total} />
              </dd>
            </div>
          </dl>
          {!purchasable && (
            <p className="text-xs text-destructive">
              Ada barang yang stoknya tidak cukup. Ubah jumlah atau hapus barang tersebut.
            </p>
          )}
          <Button className="w-full" size="lg" disabled={!canPay} onClick={pay}>
            {paying && <Spinner />}
            Bayar
          </Button>
          <p className="text-xs text-muted-foreground">
            Stok ditahan 24 jam setelah pesanan dibuat. Selesaikan pembayaran sebelum batas waktu.
            Dengan membayar, kamu menyetujui{" "}
            <Link href="/terms" target="_blank" className="underline underline-offset-4">
              Syarat &amp; Ketentuan
            </Link>{" "}
            serta{" "}
            <Link href="/returns" target="_blank" className="underline underline-offset-4">
              Kebijakan Pengembalian
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function OptionCard({
  value,
  checked,
  children,
}: {
  value: string;
  checked: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50",
        checked && "border-primary bg-primary/5",
      )}
    >
      <RadioGroupItem value={value} className="mt-1" />
      <div className="min-w-0 flex-1 space-y-0.5">{children}</div>
    </label>
  );
}
