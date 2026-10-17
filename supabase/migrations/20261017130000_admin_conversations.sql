-- #100 — Daftar inbox admin: percakapan + nama/email pembeli + nomor pesanan,
-- filter & pencarian, cursor pagination (last_message_at, id).

create function public.admin_list_conversations(
  p_filter text default 'needs_reply',
  p_kind text default null,
  p_q text default null,
  p_limit int default 30,
  p_before_at timestamptz default null,
  p_before_id uuid default null
)
returns table (
  id uuid,
  subject text,
  status public.conversation_status,
  order_id uuid,
  order_number text,
  customer_id uuid,
  customer_name text,
  customer_email text,
  last_message_at timestamptz,
  last_message_preview text,
  last_sender public.message_sender,
  needs_reply boolean,
  unread boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_q text := nullif(trim(coalesce(p_q, '')), '');
begin
  perform private.assert_admin();

  return query
  select
    c.id,
    c.subject,
    c.status,
    c.order_id,
    o.order_number::text,
    c.customer_id,
    p.full_name,
    u.email::text,
    c.last_message_at,
    c.last_message_preview,
    c.last_sender,
    (c.status = 'open' and c.last_sender = 'customer'),
    (c.last_sender = 'customer'
      and c.last_message_at > coalesce(c.admin_last_read_at, '-infinity'::timestamptz))
  from public.conversations c
  join public.profiles p on p.id = c.customer_id
  left join auth.users u on u.id = c.customer_id
  left join public.orders o on o.id = c.order_id
  where c.last_sender is not null
    and case coalesce(p_filter, 'all')
          when 'needs_reply' then c.status = 'open' and c.last_sender = 'customer'
          when 'open' then c.status = 'open'
          when 'closed' then c.status = 'closed'
          else true
        end
    and (p_kind is null
         or (p_kind = 'order' and c.order_id is not null)
         or (p_kind = 'general' and c.order_id is null))
    and (v_q is null
         or c.subject ilike '%' || v_q || '%'
         or p.full_name ilike '%' || v_q || '%'
         or u.email ilike '%' || v_q || '%'
         or o.order_number ilike '%' || v_q || '%')
    and (p_before_at is null
         or (c.last_message_at, c.id) < (p_before_at, coalesce(p_before_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)))
  order by c.last_message_at desc, c.id desc
  limit least(greatest(coalesce(p_limit, 30), 1), 100);
end;
$$;

revoke execute on function public.admin_list_conversations(text, text, text, int, timestamptz, uuid) from public, anon;
grant execute on function public.admin_list_conversations(text, text, text, int, timestamptz, uuid) to authenticated, service_role;
