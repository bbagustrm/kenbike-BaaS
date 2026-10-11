"use client";

import { MenuIcon, SearchIcon } from "lucide-react";
import Form from "next/form";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

import { NAV_LINKS } from "./nav-links";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button variant="ghost" size="icon" className="md:hidden" aria-label="Buka menu" />}
      >
        <MenuIcon />
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <SheetHeader>
          <SheetTitle>KenBike</SheetTitle>
        </SheetHeader>
        <Form
          action="/products"
          role="search"
          className="relative px-4"
          onSubmit={() => setOpen(false)}
        >
          <SearchIcon className="pointer-events-none absolute top-1/2 left-6.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            type="search"
            placeholder="Cari sepeda, sparepart…"
            aria-label="Cari produk"
            className="pl-8"
          />
        </Form>
        <nav aria-label="Navigasi utama" className="flex flex-col gap-1 px-4">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-md px-2 py-2 text-sm font-medium hover:bg-muted"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
