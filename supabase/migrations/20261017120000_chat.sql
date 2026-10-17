-- #98 — Chat pembeli ↔ admin: percakapan umum & per pesanan, lampiran, realtime.
-- Semua penulisan lewat RPC (validasi kepemilikan & lampiran di satu tempat);
-- SELECT dibuka lewat RLS agar Supabase Realtime (postgres_changes) memfilter per penerima.

create type public.conversation_status as enum ('open', 'closed');
create type public.message_sender as enum ('customer', 'admin', 'system');

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete cascade,
  -- null = chat umum; satu percakapan per pesanan.
  order_id uuid unique references public.orders (id) on delete set null,
  subject text not null check (char_length(subject) between 1 and 120),
  status public.conversation_status not null default 'open',
  last_message_at timestamptz not null default now(),
  last_message_preview text not null default '' check (char_length(last_message_preview) <= 140),
  last_sender public.message_sender,
  customer_last_read_at timestamptz,
  admin_last_read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index conversations_customer_idx on public.conversations (customer_id, last_message_at desc);
create index conversations_inbox_idx on public.conversations (status, last_message_at desc);

create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute function private.set_updated_at();

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  -- null untuk pesan sistem.
  sender_id uuid references public.profiles (id) on delete set null,
  sender_role public.message_sender not null,
  body text not null default '' check (char_length(body) <= 4000),
  -- [{ "path": "{conversation_id}/{uuid}.{ext}", "name": "...", "type": "image/png", "size": 123 }]
  attachments jsonb not null default '[]'::jsonb
    check (jsonb_typeof(attachments) = 'array' and jsonb_array_length(attachments) <= 5),
  -- clock_timestamp: urutan & status dibaca tetap benar untuk beberapa pesan dalam satu transaksi.
  created_at timestamptz not null default clock_timestamp(),
  constraint messages_not_empty check (char_length(body) > 0 or jsonb_array_length(attachments) > 0)
);

create index messages_conversation_idx on public.messages (conversation_id, created_at desc);

-- ------------------------------------------------------------
-- Ringkasan percakapan diperbarui setiap pesan baru; balasan pembeli membuka
-- kembali percakapan yang sudah ditutup admin.
-- ------------------------------------------------------------
create function private.messages_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations
  set last_message_at = new.created_at,
      last_message_preview = left(
        case when new.body <> '' then regexp_replace(new.body, '\s+', ' ', 'g')
             else '📎 Lampiran' end,
        140),
      last_sender = new.sender_role,
      status = case when new.sender_role = 'customer' then 'open' else status end,
      customer_last_read_at = case when new.sender_role = 'customer' then new.created_at
                                   else customer_last_read_at end,
      admin_last_read_at = case when new.sender_role = 'admin' then new.created_at
                                else admin_last_read_at end
  where id = new.conversation_id;
  return null;
end;
$$;

create trigger messages_after_insert
  after insert on public.messages
  for each row execute function private.messages_after_insert();

-- ------------------------------------------------------------
-- RLS: baca oleh pemilik percakapan & admin. Tidak ada INSERT/UPDATE/DELETE langsung.
-- ------------------------------------------------------------
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create function private.can_access_conversation(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_admin() or exists (
    select 1 from public.conversations c
    where c.id = p_conversation_id and c.customer_id = (select auth.uid())
  )
$$;

revoke execute on function private.can_access_conversation(uuid) from public;
grant execute on function private.can_access_conversation(uuid) to authenticated, service_role;

create policy conversations_select on public.conversations
  for select to authenticated
  using (customer_id = (select auth.uid()) or (select private.is_admin()));

create policy messages_select on public.messages
  for select to authenticated
  using ((select private.can_access_conversation(conversation_id)));

revoke all on public.conversations, public.messages from anon, authenticated;
grant select on public.conversations, public.messages to authenticated;
grant all on public.conversations, public.messages to service_role;

-- Realtime: pesan baru & perubahan ringkasan (badge, daftar inbox).
alter publication supabase_realtime add table public.messages, public.conversations;

-- ------------------------------------------------------------
-- Validasi lampiran: array objek {path,name,type,size}; path di folder percakapan.
-- ------------------------------------------------------------
create function private.valid_chat_attachments(p_conversation_id uuid, p_attachments jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(p_attachments) = 'array'
    and jsonb_array_length(p_attachments) <= 5
    and not exists (
      select 1 from jsonb_array_elements(p_attachments) a
      where jsonb_typeof(a) <> 'object'
         or coalesce(a ->> 'path', '') !~ ('^' || p_conversation_id::text || '/[0-9a-f-]{36}\.(jpg|png|webp|pdf)$')
         or coalesce(a ->> 'type', '') not in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')
         or char_length(coalesce(a ->> 'name', '')) not between 1 and 200
         or (case when coalesce(a ->> 'size', '') ~ '^[0-9]{1,9}$' then (a ->> 'size')::bigint
                  else 0 end) not between 1 and 5242880
    )
$$;

-- ------------------------------------------------------------
-- send_message — pemilik percakapan (customer) atau admin.
-- ------------------------------------------------------------
create function public.send_message(
  p_conversation_id uuid,
  p_body text,
  p_attachments jsonb default '[]'::jsonb
)
returns public.messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_role public.message_sender;
  v_body text := trim(coalesce(p_body, ''));
  v_attachments jsonb := coalesce(p_attachments, '[]'::jsonb);
  v_message public.messages;
begin
  if v_uid is null or not private.can_access_conversation(p_conversation_id) then
    raise exception 'conversation_not_found' using errcode = 'P0002';
  end if;
  if char_length(v_body) > 4000 then
    raise exception 'message_too_long' using errcode = '22023';
  end if;
  if not private.valid_chat_attachments(p_conversation_id, v_attachments) then
    raise exception 'invalid_attachments' using errcode = '22023';
  end if;
  if v_body = '' and jsonb_array_length(v_attachments) = 0 then
    raise exception 'empty_message' using errcode = '22023';
  end if;

  v_role := case when private.is_admin() then 'admin' else 'customer' end;

  insert into public.messages (conversation_id, sender_id, sender_role, body, attachments)
  values (p_conversation_id, v_uid, v_role, v_body, v_attachments)
  returning * into v_message;
  return v_message;
end;
$$;

revoke execute on function public.send_message(uuid, text, jsonb) from public, anon;
grant execute on function public.send_message(uuid, text, jsonb) to authenticated, service_role;

-- ------------------------------------------------------------
-- start_conversation — pembeli. Chat pesanan: satu per order (yang sudah ada dikembalikan).
-- Pesan pertama dikirim terpisah lewat send_message (lampiran butuh id percakapan).
-- ------------------------------------------------------------
create function public.start_conversation(p_subject text, p_order_id uuid default null)
returns public.conversations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_subject text := trim(coalesce(p_subject, ''));
  v_order public.orders;
  v_conversation public.conversations;
begin
  if v_uid is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_order_id is not null then
    select * into v_order from public.orders where id = p_order_id and profile_id = v_uid;
    if not found then
      raise exception 'order_not_found' using errcode = 'P0002';
    end if;
    select * into v_conversation from public.conversations where order_id = p_order_id;
    if found then
      return v_conversation;
    end if;
    if v_subject = '' then
      v_subject := 'Pesanan ' || v_order.order_number;
    end if;
  end if;

  if char_length(v_subject) not between 1 and 120 then
    raise exception 'invalid_subject' using errcode = '22023';
  end if;

  insert into public.conversations (customer_id, order_id, subject, last_message_preview)
  values (v_uid, p_order_id, v_subject, '')
  on conflict (order_id) do nothing
  returning * into v_conversation;

  if v_conversation.id is null then
    -- Balapan dua tab: percakapan pesanan baru saja dibuat tab lain.
    select * into v_conversation from public.conversations where order_id = p_order_id;
  end if;
  return v_conversation;
end;
$$;

revoke execute on function public.start_conversation(text, uuid) from public, anon;
grant execute on function public.start_conversation(text, uuid) to authenticated, service_role;

-- ------------------------------------------------------------
-- mark_conversation_read — tandai dibaca oleh pemanggil (pembeli/admin).
-- ------------------------------------------------------------
create function public.mark_conversation_read(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.can_access_conversation(p_conversation_id) then
    raise exception 'conversation_not_found' using errcode = 'P0002';
  end if;
  if private.is_admin() then
    update public.conversations set admin_last_read_at = clock_timestamp() where id = p_conversation_id;
  else
    update public.conversations set customer_last_read_at = clock_timestamp() where id = p_conversation_id;
  end if;
end;
$$;

revoke execute on function public.mark_conversation_read(uuid) from public, anon;
grant execute on function public.mark_conversation_read(uuid) to authenticated, service_role;

-- ------------------------------------------------------------
-- set_conversation_status — admin menutup / membuka kembali.
-- ------------------------------------------------------------
create function public.set_conversation_status(
  p_conversation_id uuid,
  p_status public.conversation_status
)
returns public.conversations
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_conversation public.conversations;
begin
  perform private.assert_admin();
  update public.conversations set status = p_status
  where id = p_conversation_id
  returning * into v_conversation;
  if not found then
    raise exception 'conversation_not_found' using errcode = 'P0002';
  end if;
  return v_conversation;
end;
$$;

revoke execute on function public.set_conversation_status(uuid, public.conversation_status) from public, anon;
grant execute on function public.set_conversation_status(uuid, public.conversation_status) to authenticated, service_role;

-- ------------------------------------------------------------
-- unread_conversation_count — badge.
-- Pembeli: percakapan miliknya dengan pesan admin/sistem yang belum dibaca.
-- Admin: percakapan terbuka yang pesan terakhirnya dari pembeli & belum dibaca admin.
-- ------------------------------------------------------------
create function public.unread_conversation_count()
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when (select auth.uid()) is null then 0
    when private.is_admin() then (
      select count(*)::int from public.conversations
      where status = 'open' and last_sender = 'customer'
        and last_message_at > coalesce(admin_last_read_at, '-infinity'::timestamptz)
    )
    else (
      select count(*)::int from public.conversations
      where customer_id = (select auth.uid())
        and last_sender in ('admin', 'system')
        and last_message_at > coalesce(customer_last_read_at, '-infinity'::timestamptz)
    )
  end
$$;

revoke execute on function public.unread_conversation_count() from public, anon;
grant execute on function public.unread_conversation_count() to authenticated, service_role;

-- ------------------------------------------------------------
-- post_system_message — server (service role): mis. "Pesanan dibatalkan, isi rekening" (#101).
-- Membuat percakapan pesanan bila belum ada.
-- ------------------------------------------------------------
create function public.post_system_message(p_order_id uuid, p_body text)
returns public.messages
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
  v_conversation_id uuid;
  v_message public.messages;
begin
  select * into v_order from public.orders where id = p_order_id;
  if not found then
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;
  if char_length(trim(coalesce(p_body, ''))) not between 1 and 4000 then
    raise exception 'empty_message' using errcode = '22023';
  end if;

  insert into public.conversations (customer_id, order_id, subject)
  values (v_order.profile_id, p_order_id, 'Pesanan ' || v_order.order_number)
  on conflict (order_id) do nothing;
  select id into v_conversation_id from public.conversations where order_id = p_order_id;

  insert into public.messages (conversation_id, sender_role, body)
  values (v_conversation_id, 'system', trim(p_body))
  returning * into v_message;
  return v_message;
end;
$$;

revoke execute on function public.post_system_message(uuid, text) from public, anon, authenticated;
grant execute on function public.post_system_message(uuid, text) to service_role;

-- ------------------------------------------------------------
-- Lampiran chat: bucket privat, path {conversation_id}/{uuid}.{ext}.
-- Tulis & baca oleh peserta percakapan (pemilik + admin).
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-attachments',
  'chat-attachments',
  false,
  5 * 1024 * 1024,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create function private.chat_folder_access(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select private.can_access_conversation(c.id)
     from public.conversations c
     where c.id::text = (storage.foldername(p_name))[1]),
    false)
$$;

revoke execute on function private.chat_folder_access(text) from public;
grant execute on function private.chat_folder_access(text) to authenticated, service_role;

create policy chat_attachments_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'chat-attachments' and (select private.chat_folder_access(name)));

create policy chat_attachments_select on storage.objects
  for select to authenticated
  using (bucket_id = 'chat-attachments' and (select private.chat_folder_access(name)));

-- Hapus hanya admin (mis. lampiran salah kirim); pembeli tidak bisa menghapus.
create policy chat_attachments_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'chat-attachments' and (select private.is_admin()));
