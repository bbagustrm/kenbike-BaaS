import Link from "next/link";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-muted/30 px-4 py-12">
      <Link href="/" className="text-2xl font-bold tracking-tight">
        KenBike
      </Link>
      <div className="w-full max-w-sm rounded-xl border bg-background p-6 shadow-sm sm:p-8">
        {children}
      </div>
    </main>
  );
}
