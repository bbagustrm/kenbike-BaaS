import type { Area } from "@/lib/biteship/types";

export type { Area };

export type Address = {
  id: string;
  label: string | null;
  recipientName: string;
  phone: string;
  addressLine: string;
  /** Area Biteship; null untuk alamat lama yang belum punya area (perlu diedit). */
  area: Area | null;
  note: string | null;
  isDefault: boolean;
};

/** Maksimal alamat per user (sama dengan trigger DB). */
export const MAX_ADDRESSES = 20;
