import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";

export default function ShopLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
