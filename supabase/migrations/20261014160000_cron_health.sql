-- #76 — Kesehatan job pg_cron untuk dashboard admin (expire order, cleanup rate limit).

create function public.admin_cron_health()
returns table (
  job_name text,
  schedule text,
  active boolean,
  last_run_at timestamptz,
  last_status text,
  last_message text,
  failures_24h bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.assert_admin();

  return query
  select
    j.jobname::text,
    j.schedule::text,
    j.active,
    last.start_time,
    last.status::text,
    left(last.return_message, 200),
    (
      select count(*)
      from cron.job_run_details d
      where d.jobid = j.jobid and d.status = 'failed' and d.start_time > now() - interval '24 hours'
    )
  from cron.job j
  left join lateral (
    select d.start_time, d.status, d.return_message
    from cron.job_run_details d
    where d.jobid = j.jobid
    order by d.start_time desc
    limit 1
  ) last on true
  order by j.jobname;
end;
$$;

revoke execute on function public.admin_cron_health() from public, anon;
grant execute on function public.admin_cron_health() to authenticated, service_role;
