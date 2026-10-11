import { Container } from "@/components/layout/container";
import { AccountNav } from "@/features/account";

export default function AccountLayout({ children }: LayoutProps<"/account">) {
  return (
    <Container className="space-y-6 py-10">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Akun saya</h1>
        <p className="text-muted-foreground">Kelola data diri dan alamat pengirimanmu.</p>
      </div>
      <AccountNav />
      {children}
    </Container>
  );
}
