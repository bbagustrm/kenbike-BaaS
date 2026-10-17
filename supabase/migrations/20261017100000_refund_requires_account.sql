-- #96/#97 — Semua refund adalah transfer manual ke rekening pembeli (keputusan 17 Okt 2026).
-- complete_refund kini mewajibkan rekening tujuan (status pending_transfer).

create or replace function public.complete_refund(p_order_id uuid, p_proof_path text, p_note text)
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

  select * into v_refund from public.refunds where order_id = p_order_id for update;
  if not found or v_refund.status = 'completed' then
    raise exception 'refund_not_found' using errcode = 'P0002';
  end if;
  if v_refund.status <> 'pending_transfer' then
    raise exception 'refund_account_missing' using errcode = 'P0001';
  end if;

  update public.refunds
  set status = 'completed',
      proof_path = v_proof,
      note = v_note,
      processed_by = (select auth.uid()),
      processed_at = now()
  where id = v_refund.id
  returning * into v_refund;

  update public.orders set payment_status = 'refunded'
  where id = p_order_id and payment_status = 'refund_pending';

  insert into public.order_status_history (order_id, status_type, status_value, source, event_key)
  values (p_order_id, 'payment', 'refunded', 'system', 'refund_completed:' || p_order_id)
  on conflict (source, event_key) do nothing;

  return v_refund;
end;
$$;
