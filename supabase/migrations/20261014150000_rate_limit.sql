-- #75 — Rate limit sederhana (fixed window) untuk Server Action sensitif:
-- checkout, cek ongkir, cari area Biteship, bayar ulang. Disimpan di schema
-- private; hanya service role yang bisa memanggil RPC-nya.

create table private.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits int not null default 1,
  primary key (key, window_start)
);

-- true = boleh lanjut; false = melewati batas pada jendela waktu ini.
create function public.check_rate_limit(p_key text, p_limit int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz;
  v_hits int;
begin
  if p_key is null or length(p_key) > 200 or p_limit < 1 or p_window_seconds < 1 then
    raise exception 'invalid_rate_limit' using errcode = '22023';
  end if;

  v_window := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into private.rate_limits as r (key, window_start)
  values (p_key, v_window)
  on conflict (key, window_start) do update set hits = r.hits + 1
  returning hits into v_hits;

  return v_hits <= p_limit;
end;
$$;

revoke execute on function public.check_rate_limit(text, int, int) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, int, int) to service_role;

-- Bersihkan jendela lama setiap jam.
select cron.schedule(
  'cleanup-rate-limits',
  '17 * * * *',
  $$ delete from private.rate_limits where window_start < now() - interval '1 day' $$
);
