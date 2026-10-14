-- #95 — Pembatalan pesanan lunas & refund manual (penuh).
-- Alur: cancel_paid_order (pembeli/admin) → set_refund_account (pembeli/admin)
--       → complete_refund (admin, dengan bukti transfer).
-- Order Biteship dibatalkan oleh Server Action SEBELUM cancel_paid_order.

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  -- Refund penuh: maksimal satu per order.
  order_id uuid not null unique references public.orders (id) on delete restrict,
  amount bigint not null check (amount > 0),
  status public.refund_status not null default 'awaiting_account',
  reason text not null check (char_length(reason) between 1 and 500),
  requested_by public.user_role not null,
  created_by uuid references public.profiles (id) on delete set null,
  bank_name varchar(50),
  account_number varchar(30),
  account_holder varchar(100),
  proof_path text,
  note text check (char_length(note) <= 1000),
  processed_by uuid references public.profiles (id) on delete set null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint refunds_account_complete check (
    (bank_name is null) = (account_number is null) and (bank_name is null) = (account_holder is null)
  ),
  constraint refunds_completed_processed check (
    status <> 'completed' or processed_at is not null
  )
);

create index refunds_status_idx on public.refunds (status) where status <> 'completed';

create trigger refunds_set_updated_at
  before update on public.refunds
  for each row execute function private.set_updated_at();

alter table public.refunds enable row level security;

-- Baca: pembeli pemilik order & admin. Tulis hanya lewat RPC di bawah.
create policy refunds_select_own_or_admin on public.refunds
  for select to authenticated
  using (
    (select private.is_admin())
    or exists (
      select 1 from public.orders o
      where o.id = refunds.order_id and o.profile_id = (select auth.uid())
    )
  );

revoke all on public.refunds from anon, authenticated;
grant select on public.refunds to authenticated;
grant all on public.refunds to service_role;

-- ------------------------------------------------------------
-- cancel_paid_order — pembeli pemilik order atau admin.
-- Hanya order lunas yang belum diambil kurir (shipping null/pending/processing).
-- Pembeli selalu mengembalikan stok; admin boleh tidak (mis. barang rusak).
-- ------------------------------------------------------------
create function public.cancel_paid_order(
  p_order_id uuid,
  p_reason text,
  p_restock boolean default true
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_admin boolean := private.is_admin();
  v_order public.orders;
  v_actor public.user_role;
  v_reason text := trim(coalesce(p_reason, ''));
begin
  if char_length(v_reason) not between 1 and 500 then
    raise exception 'invalid_reason' using errcode = '22023';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found or not (v_admin or v_order.profile_id = v_uid) then
    -- Order milik orang lain diperlakukan sama dengan tidak ada.
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;
  v_actor := case when v_admin then 'admin' else 'customer' end;

  if v_order.payment_status <> 'paid'
     or coalesce(v_order.shipping_status, 'pending') not in ('pending', 'processing') then
    raise exception 'order_not_cancellable' using errcode = 'P0001';
  end if;

  -- Kembalikan stok yang sudah dipotong saat pembayaran (reservasi 'confirmed').
  -- Order bayar-telat-tanpa-stok tidak punya reservasi confirmed → tidak ada yang dikembalikan.
  if v_actor = 'customer' or coalesce(p_restock, true) then
    perform 1
    from public.product_variants v
    where v.id in (select r.variant_id from public.stock_reservations r
                   where r.order_id = p_order_id and r.status = 'confirmed')
    order by v.id
    for update;

    with released as (
      update public.stock_reservations
      set status = 'released'
      where order_id = p_order_id and status = 'confirmed'
      returning variant_id, quantity
    ),
    per_variant as (
      select variant_id, sum(quantity)::int as qty from released group by variant_id
    ),
    restocked as (
      update public.product_variants v
      set quantity = v.quantity + p.qty
      from per_variant p
      where v.id = p.variant_id
      returning v.id, p.qty, v.quantity
    )
    insert into public.stock_adjustments (variant_id, delta, quantity_after, reason, admin_id)
    select id, qty, quantity, left('Pembatalan pesanan ' || v_order.order_number, 200),
           case when v_admin then v_uid end
    from restocked;
  end if;

  update public.orders
  set payment_status = 'refund_pending',
      shipping_status = 'cancelled',
      attention_reason = null
  where id = p_order_id
  returning * into v_order;

  insert into public.refunds (order_id, amount, reason, requested_by, created_by)
  values (p_order_id, v_order.total_amount, v_reason, v_actor, v_uid);

  insert into public.order_status_history
    (order_id, status_type, status_value, source, event_key, raw_payload)
  values
    (p_order_id, 'shipping', 'cancelled', 'system', 'cancel_paid:shipping:' || p_order_id,
     jsonb_build_object('actor', v_actor, 'restock', v_actor = 'customer' or coalesce(p_restock, true))),
    (p_order_id, 'payment', 'refund_pending', 'system', 'cancel_paid:payment:' || p_order_id,
     jsonb_build_object('actor', v_actor))
  on conflict (source, event_key) do nothing;

  return v_order;
end;
$$;

revoke execute on function public.cancel_paid_order(uuid, text, boolean) from public, anon;
grant execute on function public.cancel_paid_order(uuid, text, boolean) to authenticated, service_role;

-- ------------------------------------------------------------
-- set_refund_account — pembeli pemilik order atau admin, selama refund belum selesai.
-- ------------------------------------------------------------
create function public.set_refund_account(
  p_order_id uuid,
  p_bank_name text,
  p_account_number text,
  p_account_holder text
)
returns public.refunds
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_refund public.refunds;
  v_bank text := trim(coalesce(p_bank_name, ''));
  v_number text := regexp_replace(coalesce(p_account_number, ''), '[\s-]', '', 'g');
  v_holder text := trim(coalesce(p_account_holder, ''));
begin
  if char_length(v_bank) not between 2 and 50
     or v_number !~ '^[0-9]{5,30}$'
     or char_length(v_holder) not between 2 and 100 then
    raise exception 'invalid_account' using errcode = '22023';
  end if;

  update public.refunds r
  set bank_name = v_bank,
      account_number = v_number,
      account_holder = v_holder,
      status = 'pending_transfer'
  from public.orders o
  where r.order_id = p_order_id
    and o.id = r.order_id
    and r.status <> 'completed'
    and ((select private.is_admin()) or o.profile_id = (select auth.uid()))
  returning r.* into v_refund;

  if not found then
    raise exception 'refund_not_editable' using errcode = 'P0001';
  end if;
  return v_refund;
end;
$$;

revoke execute on function public.set_refund_account(uuid, text, text, text) from public, anon;
grant execute on function public.set_refund_account(uuid, text, text, text) to authenticated, service_role;

-- ------------------------------------------------------------
-- complete_refund — admin. Bukti (path Storage refund-proofs) atau catatan wajib.
-- Refund lewat dashboard Midtrans (kartu/e-wallet) boleh tanpa data rekening.
-- ------------------------------------------------------------
create function public.complete_refund(p_order_id uuid, p_proof_path text, p_note text)
returns public.refunds
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_refund public.refunds;
  v_proof text := nullif(trim(coalesce(p_proof_path, '')), '');
  v_note text := nullif(trim(coalesce(p_note, '')), '');
begin
  perform private.assert_admin();

  if v_proof is null and v_note is null then
    raise exception 'proof_or_note_required' using errcode = '22023';
  end if;
  if v_proof is not null and v_proof !~ ('^' || p_order_id::text || '/[^/]+$') then
    raise exception 'invalid_proof_path' using errcode = '22023';
  end if;
  if char_length(v_note) > 1000 then
    raise exception 'invalid_note' using errcode = '22023';
  end if;

  update public.refunds
  set status = 'completed',
      proof_path = v_proof,
      note = v_note,
      processed_by = (select auth.uid()),
      processed_at = now()
  where order_id = p_order_id and status <> 'completed'
  returning * into v_refund;
  if not found then
    raise exception 'refund_not_found' using errcode = 'P0002';
  end if;

  update public.orders set payment_status = 'refunded'
  where id = p_order_id and payment_status = 'refund_pending';

  insert into public.order_status_history (order_id, status_type, status_value, source, event_key)
  values (p_order_id, 'payment', 'refunded', 'system', 'refund_completed:' || p_order_id)
  on conflict (source, event_key) do nothing;

  return v_refund;
end;
$$;

revoke execute on function public.complete_refund(uuid, text, text) from public, anon;
grant execute on function public.complete_refund(uuid, text, text) to authenticated, service_role;

-- ------------------------------------------------------------
-- Bukti transfer refund: bucket privat. Path: {order_id}/{file}.
-- Admin kelola; pembeli hanya membaca bukti order miliknya.
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'refund-proofs',
  'refund-proofs',
  false,
  5 * 1024 * 1024,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy refund_proofs_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'refund-proofs' and (select private.is_admin()));

create policy refund_proofs_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'refund-proofs' and (select private.is_admin()))
  with check (bucket_id = 'refund-proofs' and (select private.is_admin()));

create policy refund_proofs_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'refund-proofs' and (select private.is_admin()));

create policy refund_proofs_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'refund-proofs'
    and (
      (select private.is_admin())
      or (storage.foldername(name))[1] in (
        select o.id::text from public.orders o where o.profile_id = (select auth.uid())
      )
    )
  );
