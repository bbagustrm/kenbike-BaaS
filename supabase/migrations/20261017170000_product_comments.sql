-- #110 — Komentar (tanya-jawab) di halaman produk.
-- - Login wajib untuk menulis; siapa pun boleh membalas, hanya 1 tingkat.
-- - Pengguna tidak bisa mengubah/menghapus; admin menyembunyikan atau menghapus.
-- - Tabel tertutup; publik membaca lewat RPC (nama penulis + penanda admin saja).

create table public.product_comments (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete set null,
  -- null = komentar utama (pertanyaan); terisi = balasan (hanya ke komentar utama).
  parent_id uuid references public.product_comments (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  is_hidden boolean not null default false,
  hidden_by uuid references public.profiles (id) on delete set null,
  hidden_at timestamptz,
  -- clock_timestamp: urutan tepat untuk beberapa komentar dalam satu transaksi.
  created_at timestamptz not null default clock_timestamp()
);

create index product_comments_roots_idx on public.product_comments (product_id, created_at desc, id desc)
  where parent_id is null;
create index product_comments_replies_idx on public.product_comments (parent_id, created_at);

-- Balasan hanya satu tingkat dan untuk produk yang sama.
create function private.product_comments_check_parent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_parent public.product_comments;
begin
  if new.parent_id is null then
    return new;
  end if;
  select * into v_parent from public.product_comments where id = new.parent_id;
  if not found then
    raise exception 'comment_not_found' using errcode = 'P0002';
  end if;
  if v_parent.parent_id is not null then
    raise exception 'reply_depth_exceeded' using errcode = 'P0001';
  end if;
  if v_parent.product_id <> new.product_id then
    raise exception 'comment_product_mismatch' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger product_comments_check_parent
  before insert on public.product_comments
  for each row execute function private.product_comments_check_parent();

alter table public.product_comments enable row level security;

create policy product_comments_admin_select on public.product_comments
  for select to authenticated using ((select private.is_admin()));

revoke all on public.product_comments from anon, authenticated;
grant select on public.product_comments to authenticated;
grant all on public.product_comments to service_role;

-- ------------------------------------------------------------
-- post_product_comment — pengguna login, produk aktif. Balasan ke komentar tersembunyi ditolak.
-- ------------------------------------------------------------
create function public.post_product_comment(
  p_product_id uuid,
  p_body text,
  p_parent_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_body text := trim(coalesce(p_body, ''));
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not exists (select 1 from public.products where id = p_product_id and is_active) then
    raise exception 'product_not_found' using errcode = 'P0002';
  end if;
  if char_length(v_body) not between 1 and 1000 then
    raise exception 'invalid_comment' using errcode = '22023';
  end if;
  if p_parent_id is not null and exists (
    select 1 from public.product_comments where id = p_parent_id and is_hidden
  ) then
    raise exception 'comment_not_found' using errcode = 'P0002';
  end if;

  insert into public.product_comments (product_id, profile_id, parent_id, body)
  values (p_product_id, v_uid, p_parent_id, v_body)
  returning id into v_id;
  return v_id;
end;
$$;

revoke execute on function public.post_product_comment(uuid, text, uuid) from public, anon;
grant execute on function public.post_product_comment(uuid, text, uuid) to authenticated, service_role;

-- Nama tampil & penanda admin penulis (tanpa membuka data profil lain).
create function private.comment_author(p_profile_id uuid)
returns table (name text, is_admin boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(nullif(trim(p.full_name), ''), 'Pengguna KenBike'), p.role = 'admin'
  from public.profiles p where p.id = p_profile_id
  union all
  select 'Pengguna KenBike', false where p_profile_id is null
  limit 1
$$;

-- ------------------------------------------------------------
-- list_product_comments — publik. Komentar utama terbaru dulu (cursor) +
-- semua balasannya (terlama dulu). Yang disembunyikan tidak ikut.
-- ------------------------------------------------------------
create function public.list_product_comments(
  p_product_id uuid,
  p_limit int default 5,
  p_before_at timestamptz default null,
  p_before_id uuid default null
)
returns table (
  id uuid,
  author_name text,
  author_is_admin boolean,
  body text,
  created_at timestamptz,
  replies jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, a.name, a.is_admin, c.body, c.created_at,
         coalesce((
           select jsonb_agg(jsonb_build_object(
                    'id', r.id,
                    'author_name', ra.name,
                    'author_is_admin', ra.is_admin,
                    'body', r.body,
                    'created_at', r.created_at) order by r.created_at)
           from public.product_comments r
           cross join lateral private.comment_author(r.profile_id) ra
           where r.parent_id = c.id and not r.is_hidden
         ), '[]'::jsonb)
  from public.product_comments c
  join public.products p on p.id = c.product_id and p.is_active
  cross join lateral private.comment_author(c.profile_id) a
  where c.product_id = p_product_id
    and c.parent_id is null
    and not c.is_hidden
    and (p_before_at is null
         or (c.created_at, c.id) < (p_before_at, coalesce(p_before_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)))
  order by c.created_at desc, c.id desc
  limit least(greatest(coalesce(p_limit, 5), 1), 20)
$$;

revoke execute on function public.list_product_comments(uuid, int, timestamptz, uuid) from public;
grant execute on function public.list_product_comments(uuid, int, timestamptz, uuid) to anon, authenticated, service_role;

create function public.product_comment_count(p_product_id uuid)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int from public.product_comments
  where product_id = p_product_id and parent_id is null and not is_hidden
$$;

revoke execute on function public.product_comment_count(uuid) from public;
grant execute on function public.product_comment_count(uuid) to anon, authenticated, service_role;

-- ------------------------------------------------------------
-- Admin: sembunyikan / tampilkan, hapus, daftar untuk manajemen (#112).
-- ------------------------------------------------------------
create function public.admin_set_comment_hidden(p_comment_id uuid, p_hidden boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.assert_admin();
  update public.product_comments
  set is_hidden = p_hidden,
      hidden_by = case when p_hidden then (select auth.uid()) end,
      hidden_at = case when p_hidden then now() end
  where id = p_comment_id;
  if not found then
    raise exception 'comment_not_found' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function public.admin_set_comment_hidden(uuid, boolean) from public, anon;
grant execute on function public.admin_set_comment_hidden(uuid, boolean) to authenticated, service_role;

create function public.admin_delete_comment(p_comment_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.assert_admin();
  delete from public.product_comments where id = p_comment_id;
  if not found then
    raise exception 'comment_not_found' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function public.admin_delete_comment(uuid) from public, anon;
grant execute on function public.admin_delete_comment(uuid) to authenticated, service_role;

-- Komentar utama untuk admin: 'unanswered' = belum ada balasan admin & tidak disembunyikan.
create function public.admin_list_comments(
  p_filter text default 'unanswered',
  p_product_id uuid default null,
  p_q text default null,
  p_limit int default 20,
  p_offset int default 0
)
returns table (
  id uuid,
  product_id uuid,
  product_name text,
  product_slug text,
  author_name text,
  author_email text,
  body text,
  is_hidden boolean,
  created_at timestamptz,
  answered boolean,
  replies jsonb,
  total_count bigint
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
  with roots as (
    select c.*,
           exists (
             select 1 from public.product_comments r
             join public.profiles rp on rp.id = r.profile_id and rp.role = 'admin'
             where r.parent_id = c.id and not r.is_hidden
           ) as answered
    from public.product_comments c
    where c.parent_id is null
  )
  select c.id, c.product_id, pr.name, pr.slug::text, a.name, u.email::text, c.body, c.is_hidden,
         c.created_at, c.answered,
         coalesce((
           select jsonb_agg(jsonb_build_object(
                    'id', r.id,
                    'author_name', ra.name,
                    'author_is_admin', ra.is_admin,
                    'body', r.body,
                    'is_hidden', r.is_hidden,
                    'created_at', r.created_at) order by r.created_at)
           from public.product_comments r
           cross join lateral private.comment_author(r.profile_id) ra
           where r.parent_id = c.id
         ), '[]'::jsonb),
         count(*) over ()
  from roots c
  join public.products pr on pr.id = c.product_id
  cross join lateral private.comment_author(c.profile_id) a
  left join auth.users u on u.id = c.profile_id
  where case coalesce(p_filter, 'all')
          when 'unanswered' then not c.answered and not c.is_hidden
          when 'hidden' then c.is_hidden
          else true
        end
    and (p_product_id is null or c.product_id = p_product_id)
    and (v_q is null or c.body ilike '%' || v_q || '%' or a.name ilike '%' || v_q || '%'
         or pr.name ilike '%' || v_q || '%')
  order by c.created_at desc, c.id desc
  limit least(greatest(coalesce(p_limit, 20), 1), 100)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

revoke execute on function public.admin_list_comments(text, uuid, text, int, int) from public, anon;
grant execute on function public.admin_list_comments(text, uuid, text, int, int) to authenticated, service_role;

-- Badge sidebar: pertanyaan yang belum dijawab admin.
create function public.admin_unanswered_comment_count()
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select case when not private.is_admin() then 0 else (
    select count(*)::int from public.product_comments c
    where c.parent_id is null and not c.is_hidden
      and not exists (
        select 1 from public.product_comments r
        join public.profiles rp on rp.id = r.profile_id and rp.role = 'admin'
        where r.parent_id = c.id and not r.is_hidden
      )
  ) end
$$;

revoke execute on function public.admin_unanswered_comment_count() from public, anon;
grant execute on function public.admin_unanswered_comment_count() to authenticated, service_role;
