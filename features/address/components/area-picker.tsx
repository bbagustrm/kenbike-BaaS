"use client";

import { MapPinIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Spinner } from "@/components/ui/spinner";

import { searchAreas } from "../actions";
import type { Area } from "../types";

const MIN_QUERY = 3;
const DEBOUNCE_MS = 350;

/**
 * Pilih kecamatan/kota dari Biteship. Hasil pencarian dimuat lewat Server
 * Action (API key tetap di server) dengan debounce.
 */
export function AreaPicker({
  value,
  onChange,
  invalid,
  id,
}: {
  value: Area | null;
  onChange: (area: Area | null) => void;
  invalid?: boolean;
  id?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ query: string; areas: Area[]; error?: string }>({
    query: "",
    areas: [],
  });
  const term = query.trim();
  const searching = term.length >= MIN_QUERY && results.query !== term;

  useEffect(() => {
    if (term.length < MIN_QUERY) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const result = await searchAreas(term);
      if (!cancelled) setResults({ query: term, ...result });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [term]);

  if (value) {
    return (
      <div className="flex items-start gap-3 rounded-lg border p-3">
        <MapPinIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-medium">{[value.district, value.city].filter(Boolean).join(", ")}</p>
          <p className="text-muted-foreground">
            {value.province} · {value.postalCode}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            onChange(null);
            setQuery("");
          }}
        >
          Ganti
        </Button>
      </div>
    );
  }

  const showList = term.length >= MIN_QUERY;
  return (
    <Command
      shouldFilter={false}
      className="h-auto rounded-lg! border bg-transparent p-0 aria-invalid:border-destructive"
      aria-invalid={invalid || undefined}
    >
      <CommandInput
        id={id}
        value={query}
        onValueChange={setQuery}
        placeholder="Ketik kecamatan, kota, atau kode pos…"
        aria-invalid={invalid || undefined}
      />
      {showList && (
        <CommandList className="max-h-56">
          {searching ? (
            <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
              <Spinner /> Mencari…
            </div>
          ) : results.error ? (
            <p className="p-3 text-sm text-destructive">{results.error}</p>
          ) : (
            <>
              <CommandEmpty>Area tidak ditemukan. Coba kata kunci lain.</CommandEmpty>
              {results.areas.map((area) => (
                <CommandItem key={area.id} value={area.id} onSelect={() => onChange(area)}>
                  <MapPinIcon className="text-muted-foreground" />
                  <span className="truncate">{area.label}</span>
                </CommandItem>
              ))}
            </>
          )}
        </CommandList>
      )}
      {!showList && (
        <p className="px-3 pt-1 pb-2 text-xs text-muted-foreground">
          Minimal {MIN_QUERY} huruf, mis. &quot;Coblong&quot; atau &quot;40132&quot;.
        </p>
      )}
    </Command>
  );
}
