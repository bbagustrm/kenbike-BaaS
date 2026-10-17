import { SearchIcon } from "lucide-react";
import Form from "next/form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

import type { InboxParams } from "../queries";
import { INBOX_FILTERS, INBOX_KINDS } from "../schemas";

/** Filter inbox admin (GET form → query string). */
export function InboxFilters({ params }: { params: InboxParams }) {
  return (
    <Form action="/admin/messages" className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-48 flex-1">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="q"
          type="search"
          placeholder="Nama, email, topik, no. pesanan…"
          aria-label="Cari percakapan"
          defaultValue={params.q}
          className="pl-8"
        />
      </div>
      <NativeSelect name="status" defaultValue={params.filter} aria-label="Status">
        {Object.entries(INBOX_FILTERS).map(([value, label]) => (
          <NativeSelectOption key={value} value={value}>
            {label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <NativeSelect name="kind" defaultValue={params.kind ?? ""} aria-label="Jenis">
        <NativeSelectOption value="">Semua jenis</NativeSelectOption>
        {Object.entries(INBOX_KINDS).map(([value, label]) => (
          <NativeSelectOption key={value} value={value}>
            {label}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <Button type="submit">Terapkan</Button>
    </Form>
  );
}
