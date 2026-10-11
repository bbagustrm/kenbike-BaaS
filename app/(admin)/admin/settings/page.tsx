import type { Metadata } from "next";

import { AdminPageHeader } from "@/features/admin";
import { StoreSettingsForm } from "@/features/admin/settings/components/store-settings-form";
import { getStoreSettingsForm } from "@/features/admin/settings/queries";

export const metadata: Metadata = { title: "Pengaturan toko · Admin" };

export default async function StoreSettingsPage() {
  const initial = await getStoreSettingsForm();
  return (
    <div className="max-w-3xl space-y-6">
      <AdminPageHeader
        title="Pengaturan toko"
        description={
          initial ? "Alamat asal pengiriman" : "Isi alamat toko agar ongkir bisa dihitung."
        }
      />
      <StoreSettingsForm initial={initial} />
    </div>
  );
}
