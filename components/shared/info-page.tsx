import { Container } from "@/components/layout/container";

/**
 * Kerangka halaman informasi/legal: judul, tanggal pembaruan, dan isi teks
 * dengan gaya tipografi sederhana (tanpa plugin typography).
 */
export function InfoPage({
  title,
  description,
  updatedAt,
  children,
}: {
  title: string;
  description?: string;
  /** mis. "14 Oktober 2026" */
  updatedAt?: string;
  children: React.ReactNode;
}) {
  return (
    <Container className="max-w-3xl space-y-8 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-lg text-muted-foreground">{description}</p>}
        {updatedAt && (
          <p className="text-sm text-muted-foreground">Terakhir diperbarui: {updatedAt}</p>
        )}
      </header>
      <div className="space-y-6 text-sm leading-relaxed sm:text-base [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_li]:mt-1 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-6 [&_p]:text-muted-foreground [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6 [&_ul]:text-muted-foreground">
        {children}
      </div>
    </Container>
  );
}
