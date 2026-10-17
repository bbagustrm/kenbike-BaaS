-- #102 — Batas email notifikasi chat (anti-spam).
-- Satu email per percakapan per 15 menit, hanya bila pesan terakhir belum dibaca
-- dan penerima tidak sedang membuka percakapan (membaca dalam 2 menit terakhir).

alter table public.conversations
  add column customer_notified_at timestamptz,
  add column admin_notified_at timestamptz;

-- Klaim atomik: true = boleh kirim email sekarang (dan waktu klaim dicatat).
create function public.claim_chat_email(p_conversation_id uuid, p_recipient text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
begin
  if p_recipient = 'customer' then
    update public.conversations
    set customer_notified_at = v_now
    where id = p_conversation_id
      and last_sender in ('admin', 'system')
      and last_message_at > coalesce(customer_last_read_at, '-infinity'::timestamptz)
      and coalesce(customer_last_read_at, '-infinity'::timestamptz) < v_now - interval '2 minutes'
      and coalesce(customer_notified_at, '-infinity'::timestamptz) < v_now - interval '15 minutes';
  elsif p_recipient = 'admin' then
    update public.conversations
    set admin_notified_at = v_now
    where id = p_conversation_id
      and last_sender = 'customer'
      and last_message_at > coalesce(admin_last_read_at, '-infinity'::timestamptz)
      and coalesce(admin_last_read_at, '-infinity'::timestamptz) < v_now - interval '2 minutes'
      and coalesce(admin_notified_at, '-infinity'::timestamptz) < v_now - interval '15 minutes';
  else
    raise exception 'invalid_recipient' using errcode = '22023';
  end if;
  return found;
end;
$$;

revoke execute on function public.claim_chat_email(uuid, text) from public, anon, authenticated;
grant execute on function public.claim_chat_email(uuid, text) to service_role;
