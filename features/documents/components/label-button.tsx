"use client";

import { ChevronDownIcon, PrinterIcon } from "lucide-react";
import { useId, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

import { useDownload } from "../download";
import {
  LABEL_LIMITS,
  LABEL_PRESETS,
  type LabelPreset,
  type LabelSize,
  labelSizeQuery,
  parseLabelSize,
} from "../label-size";

/** Ukuran terakhir disimpan per perangkat (printer admin biasanya tetap). */
const STORAGE_KEY = "kenbike:label-size";
const CHANGE_EVENT = "kenbike:label-size";

function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function remember(query: string) {
  try {
    localStorage.setItem(STORAGE_KEY, query);
  } catch {
    // Mode privat / storage diblokir — cukup tidak diingat.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function sizeLabel({ width, height }: LabelSize): string {
  const preset = Object.values(LABEL_PRESETS).find((p) => p.width === width && p.height === height);
  if (preset) return preset.label;
  return height === null ? `Roll ${width} mm` : `${width} × ${height} mm`;
}

export function LabelButton({ orderNumber }: { orderNumber: string }) {
  const { pending, download } = useDownload();
  const stored = useSyncExternalStore(subscribe, readStored, () => null);
  const current = parseLabelSize(new URLSearchParams(stored ?? ""));
  const [customOpen, setCustomOpen] = useState(false);

  function downloadWith(query: string) {
    remember(query);
    void download(
      `/api/admin/orders/${encodeURIComponent(orderNumber)}/label?${query}`,
      `Resi-${orderNumber}.pdf`,
    );
  }

  return (
    <>
      <ButtonGroup>
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => downloadWith(labelSizeQuery(current))}
        >
          {pending ? <Spinner /> : <PrinterIcon />}
          Unduh resi
          <span className="text-muted-foreground">· {sizeLabel(current)}</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="outline"
                size="icon-sm"
                disabled={pending}
                aria-label="Pilih ukuran resi"
              />
            }
          >
            <ChevronDownIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Ukuran kertas</DropdownMenuLabel>
              {(Object.keys(LABEL_PRESETS) as LabelPreset[]).map((key) => (
                <DropdownMenuItem key={key} onClick={() => downloadWith(labelSizeQuery(key))}>
                  {LABEL_PRESETS[key].label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setCustomOpen(true)}>Ukuran kustom…</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </ButtonGroup>
      <CustomSizeDialog
        open={customOpen}
        onOpenChange={setCustomOpen}
        initial={current}
        onSubmit={(size) => {
          setCustomOpen(false);
          downloadWith(labelSizeQuery(size));
        }}
      />
    </>
  );
}

function CustomSizeDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: LabelSize;
  onSubmit: (size: LabelSize) => void;
}) {
  const id = useId();
  const { width: w, height: h } = LABEL_LIMITS;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <form
          // key: isi ulang nilai awal setiap kali dialog dibuka.
          key={String(open)}
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const height = String(data.get("height") ?? "").trim();
            onSubmit(
              parseLabelSize(
                new URLSearchParams({ w: String(data.get("width")), ...(height && { h: height }) }),
              ),
            );
          }}
        >
          <DialogHeader>
            <DialogTitle>Ukuran resi kustom</DialogTitle>
            <DialogDescription>Sesuaikan dengan kertas printer thermal (mm).</DialogDescription>
          </DialogHeader>
          <FieldGroup className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor={`${id}-w`}>Lebar</FieldLabel>
              <Input
                id={`${id}-w`}
                name="width"
                type="number"
                inputMode="numeric"
                required
                min={w.min}
                max={w.max}
                defaultValue={initial.width}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-h`}>Tinggi</FieldLabel>
              <Input
                id={`${id}-h`}
                name="height"
                type="number"
                inputMode="numeric"
                min={h.min}
                max={h.max}
                placeholder="Otomatis"
                defaultValue={initial.height ?? ""}
              />
            </Field>
          </FieldGroup>
          <FieldDescription>
            Lebar {w.min}–{w.max} mm. Kosongkan tinggi untuk kertas roll (tinggi mengikuti isi).
          </FieldDescription>
          <DialogFooter>
            <Button type="submit">
              <PrinterIcon />
              Unduh resi
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
