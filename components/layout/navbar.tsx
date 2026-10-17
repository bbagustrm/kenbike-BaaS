import { SearchIcon } from "lucide-react";
import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";

import { ThemeToggle } from "@/components/shared/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CartButton } from "@/features/cart";

import { CartSession } from "./cart-session";
import { ReviewPromptSession } from "./review-prompt-session";
import { Container } from "./container";
import { MobileNav } from "./mobile-nav";
import { NAV_LINKS } from "./nav-links";
import { UserSlot } from "./user-slot";

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <Container className="flex h-16 items-center gap-4">
        <MobileNav />
        <Link href="/" className="text-lg font-bold tracking-tight">
          KenBike
        </Link>

        <nav aria-label="Navigasi utama" className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Form GET (next/form): navigasi client-side, tetap berfungsi tanpa JavaScript. */}
        <Form
          action="/products"
          role="search"
          className="relative ml-auto hidden max-w-xs flex-1 sm:block"
        >
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            type="search"
            placeholder="Cari sepeda, sparepart…"
            aria-label="Cari produk"
            className="pl-8"
          />
        </Form>

        <div className="ml-auto flex items-center gap-1 sm:ml-0">
          <ThemeToggle />
          <CartButton />
          <Suspense fallback={null}>
            <CartSession />
          </Suspense>
          <Suspense fallback={null}>
            <ReviewPromptSession />
          </Suspense>
          {/* Membaca session per request → wajib di dalam Suspense (Cache Components). */}
          <Suspense fallback={<Skeleton className="size-8 rounded-full" />}>
            <UserSlot />
          </Suspense>
        </div>
      </Container>
    </header>
  );
}
