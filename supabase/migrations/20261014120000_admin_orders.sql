-- M9 — RPC admin: daftar pengguna (#73) & ringkasan dashboard (#72).
-- Keduanya security definer + private.assert_admin(): email ada di auth.users
-- yang tidak dibuka ke klien, dan agregasi dihitung di DB.

create function public.admin_list_users(
  p_query text default null,
  p_role public.user_role default null,
  p_limit int default 20,
  p_offset int default 0
)
returns table (
  id uuid,
  email text,
  full_name text,
  phone text,
  role public.user_role,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  order_count bigint,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_query text := nullif(trim(p_query), '');
begin
  perform private.assert_admin();

  return query
  with filtered as (
    select p.id, u.email::text, p.full_name, p.phone, p.role, p.created_at, u.last_sign_in_at
    from public.profiles p
    join auth.users u on u.id = p.id
    where (p_role is null or p.role = p_role)
      and (
        v_query is null
        or u.email ilike '%' || v_query || '%'
        or p.full_name ilike '%' || v_query || '%'
      )
  )
  select f.*,
         (select count(*) from public.orders o where o.profile_id = f.id),
         count(*) over ()
  from filtered f
  order by f.created_at desc
  limit least(greatest(p_limit, 1), 100)
  offset greatest(p_offset, 0);
end;
$$;

revoke execute on function public.admin_list_users(text, public.user_role, int, int) from public, anon;
grant execute on function public.admin_list_users(text, public.user_role, int, int) to authenticated, service_role;

-- ------------------------------------------------------------

create function public.admin_dashboard_stats(p_days int default 30, p_low_stock int default 2)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_days int := least(greatest(p_days, 1), 365);
  v_since timestamptz;
  v_result jsonb;
begin
  perform private.assert_admin();
  -- Hari dihitung per kalender WIB.
  v_since := (date_trunc('day', now() at time zone 'Asia/Jakarta')
              - make_interval(days => v_days - 1)) at time zone 'Asia/Jakarta';

  select jsonb_build_object(
    'days', v_days,
    'revenue', coalesce((select sum(total_amount) from public.orders
                         where payment_status = 'paid' and paid_at >= v_since), 0),
    'paid_orders', (select count(*) from public.orders
                    where payment_status = 'paid' and paid_at >= v_since),
    'pending_payment', (select count(*) from public.orders where payment_status = 'pending_payment'),
    'to_ship', (select count(*) from public.orders
                where payment_status = 'paid' and shipping_status in ('pending', 'processing')),
    'shipped', (select count(*) from public.orders
                where payment_status = 'paid' and shipping_status = 'shipped'),
    'attention', (select count(*) from public.orders where attention_reason is not null),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object('date', d.day, 'revenue', coalesce(r.revenue, 0), 'orders', coalesce(r.orders, 0))
                       order by d.day)
      from generate_series(
        (v_since at time zone 'Asia/Jakarta')::date,
        (now() at time zone 'Asia/Jakarta')::date,
        interval '1 day'
      ) as d(day)
      left join (
        select (paid_at at time zone 'Asia/Jakarta')::date as day,
               sum(total_amount) as revenue,
               count(*) as orders
        from public.orders
        where payment_status = 'paid' and paid_at >= v_since
        group by 1
      ) r on r.day = d.day::date
    ), '[]'::jsonb),
    'low_stock', coalesce((
      select jsonb_agg(x order by x->>'available')
      from (
        select jsonb_build_object(
          'product_id', p.id, 'product_name', p.name, 'sku', v.sku,
          'available', private.variant_available_qty(v.id)
        ) as x
        from public.product_variants v
        join public.products p on p.id = v.product_id
        where v.is_active and p.is_active and private.variant_available_qty(v.id) <= p_low_stock
        order by private.variant_available_qty(v.id), p.name
        limit 10
      ) s
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

revoke execute on function public.admin_dashboard_stats(int, int) from public, anon;
grant execute on function public.admin_dashboard_stats(int, int) to authenticated, service_role;
