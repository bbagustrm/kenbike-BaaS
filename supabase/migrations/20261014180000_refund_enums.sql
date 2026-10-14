-- #95 — Status untuk pembatalan pesanan lunas + refund manual.
-- File terpisah: nilai enum baru baru bisa dipakai setelah transaksi ini commit.

-- paid → refund_pending (dibatalkan, dana belum kembali) → refunded.
alter type public.payment_status add value if not exists 'refund_pending' after 'paid';

-- Progres refund manual (transfer oleh admin).
create type public.refund_status as enum (
  'awaiting_account',  -- menunggu data rekening pembeli
  'pending_transfer',  -- rekening ada, admin belum transfer
  'completed'
);
