import type { Metadata } from "next";

export const metadata: Metadata = { title: "Panel admin" };

export default function AdminHomePage() {
  return (
    <main className="space-y-2 p-8">
      <h1 className="text-2xl font-bold tracking-tight">Panel admin</h1>
      <p className="text-muted-foreground">Dashboard dikerjakan di M3/M9.</p>
    </main>
  );
}
