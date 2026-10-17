-- #106 — Ulasan produk.
-- - Satu ulasan per pesanan (delivered), berlaku untuk setiap produk di pesanan itu.
-- - Ulasan impor (mis. migrasi Shopee) dibuat admin tanpa pesanan.
-- - Tidak bisa diubah/dihapus pembeli; admin membalas & menghapus (soft delete).
-- - Tabel tertutup (RLS admin); publik membaca lewat RPC yang hanya membuka kolom aman.

create type public.review_source as enum ('customer', 'imported');

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  source public.review_source not null default 'customer',
  order_id uuid unique references public.orders (id) on delete restrict,
  profile_id uuid references public.profiles (id) on delete set null,
  reviewer_name text not null check (char_length(reviewer_name) between 1 and 100),
  rating smallint not null check (rating between 1 and 5),
  body text not null default '' check (char_length(body) <= 1000),
  admin_reply text check (char_length(admin_reply) between 1 and 1000),
  admin_reply_by uuid references public.profiles (id) on delete set null,
  admin_reply_at timestamptz,
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint reviews_source_order check ((source = 'customer') = (order_id is not null))
);

create index reviews_created_idx on public.reviews (created_at desc) where deleted_at is null;
create index reviews_unreplied_idx on public.reviews (created_at desc)
  where deleted_at is null and admin_reply is null;

-- Produk yang diulas (satu baris per produk; label varian digabung bila lebih dari satu).
create table public.review_products (
  review_id uuid not null references public.reviews (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  variant_label text check (char_length(variant_label) <= 300),
  primary key (review_id, product_id)
);

create index review_products_product_idx on public.review_products (product_id);

create table public.review_photos (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews (id) on delete cascade,
  storage_path text not null check (char_length(storage_path) <= 300),
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

create index review_photos_review_idx on public.review_photos (review_id, sort_order);

-- Modal "Pesanan sudah sampai" yang ditutup ("Nanti") tidak muncul lagi.
alter table public.orders add column review_prompt_dismissed_at timestamptz;

-- ------------------------------------------------------------
-- Agregat rating di products (untuk katalog & JSON-LD). Hanya trigger yang
-- boleh mengubahnya; update admin biasa tidak bisa memalsukan rating.
-- ------------------------------------------------------------
alter table public.products
  add column rating_avg numeric(3, 2) not null default 0 check (rating_avg between 0 and 5),
  add column rating_count int not null default 0 check (rating_count >= 0);

create function private.products_protect_rating()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(current_setting('kenbike.rating_sync', true), '') <> 'on' then
    new.rating_avg := old.rating_avg;
    new.rating_count := old.rating_count;
  end if;
  return new;
end;
$$;

create trigger products_protect_rating
  before update of rating_avg, rating_count on public.products
  for each row execute function private.products_protect_rating();

create function private.refresh_product_rating(p_product_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('kenbike.rating_sync', 'on', true);
  update public.products p
  set rating_count = s.cnt,
      rating_avg = s.avg
  from (
    select pid as product_id,
           count(r.id)::int as cnt,
           coalesce(round(avg(r.rating), 2), 0) as avg
    from unnest(p_product_ids) as pid
    left join public.review_products rp on rp.product_id = pid
    left join public.reviews r on r.id = rp.review_id and r.deleted_at is null
    group by pid
  ) s
  where p.id = s.product_id;
  perform set_config('kenbike.rating_sync', 'off', true);
end;
$$;

create function private.review_products_after_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.refresh_product_rating(array[coalesce(new.product_id, old.product_id)]);
  return null;
end;
$$;

create trigger review_products_after_change
  after insert or delete on public.review_products
  for each row execute function private.review_products_after_change();

create function private.reviews_after_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.deleted_at is distinct from old.deleted_at or new.rating <> old.rating then
    perform private.refresh_product_rating(
      array(select product_id from public.review_products where review_id = new.id)
    );
  end if;
  return null;
end;
$$;

create trigger reviews_after_update
  after update on public.reviews
  for each row execute function private.reviews_after_update();

-- ------------------------------------------------------------
-- RLS: hanya admin membaca tabel langsung; publik & pembeli lewat RPC.
-- ------------------------------------------------------------
alter table public.reviews enable row level security;
alter table public.review_products enable row level security;
alter table public.review_photos enable row level security;

create policy reviews_admin_select on public.reviews
  for select to authenticated using ((select private.is_admin()));
create policy review_products_admin_select on public.review_products
  for select to authenticated using ((select private.is_admin()));
create policy review_photos_admin_select on public.review_photos
  for select to authenticated using ((select private.is_admin()));

revoke all on public.reviews, public.review_products, public.review_photos from anon, authenticated;
grant select on public.reviews, public.review_products, public.review_photos to authenticated;
grant all on public.reviews, public.review_products, public.review_photos to service_role;

-- ------------------------------------------------------------
-- Foto ulasan: bucket publik. Unggah ke folder milik sendiri ({uid}/...);
-- RPC memastikan path berasal dari folder pemanggil.
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('review-photos', 'review-photos', true, 5 * 1024 * 1024,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy review_photos_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'review-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy review_photos_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'review-photos' and (select private.is_admin()));

create function private.valid_review_photos(p_paths text[], p_owner uuid)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(array_length(p_paths, 1), 0) <= 5
    and not exists (
      select 1 from unnest(coalesce(p_paths, '{}')) as path
      where path !~ ('^' || p_owner::text || '/[0-9a-f-]{36}\.(jpg|png|webp)$')
    )
$$;

-- ------------------------------------------------------------
-- submit_order_review — pembeli pemilik pesanan delivered, sekali per pesanan.
-- ------------------------------------------------------------
create function public.submit_order_review(
  p_order_id uuid,
  p_rating int,
  p_body text default '',
  p_photo_paths text[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_order public.orders;
  v_body text := trim(coalesce(p_body, ''));
  v_name text;
  v_review_id uuid;
begin
  select * into v_order from public.orders where id = p_order_id and profile_id = v_uid;
  if v_uid is null or not found then
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;
  if v_order.shipping_status is distinct from 'delivered' then
    raise exception 'order_not_delivered' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.reviews where order_id = p_order_id) then
    raise exception 'already_reviewed' using errcode = 'P0001';
  end if;
  if p_rating is null or p_rating not between 1 and 5 then
    raise exception 'invalid_rating' using errcode = '22023';
  end if;
  if char_length(v_body) > 1000 then
    raise exception 'review_too_long' using errcode = '22023';
  end if;
  if not private.valid_review_photos(p_photo_paths, v_uid) then
    raise exception 'invalid_photos' using errcode = '22023';
  end if;

  select coalesce(nullif(trim(full_name), ''), 'Pembeli KenBike') into v_name
  from public.profiles where id = v_uid;

  insert into public.reviews (source, order_id, profile_id, reviewer_name, rating, body)
  values ('customer', p_order_id, v_uid, left(v_name, 100), p_rating, v_body)
  returning id into v_review_id;

  insert into public.review_products (review_id, product_id, variant_label)
  select v_review_id, v.product_id,
         nullif(string_agg(distinct oi.variant_label_snapshot, ', '), '')
  from public.order_items oi
  join public.product_variants v on v.id = oi.variant_id
  where oi.order_id = p_order_id
  group by v.product_id;

  insert into public.review_photos (review_id, storage_path, sort_order)
  select v_review_id, path, (ord - 1)::smallint
  from unnest(coalesce(p_photo_paths, '{}')) with ordinality as t(path, ord);

  return v_review_id;
end;
$$;

revoke execute on function public.submit_order_review(uuid, int, text, text[]) from public, anon;
grant execute on function public.submit_order_review(uuid, int, text, text[]) to authenticated, service_role;

-- ------------------------------------------------------------
-- Pesanan delivered yang belum diulas (untuk modal & detail pesanan).
-- p_prompt_only = true → abaikan yang sudah ditutup ("Nanti").
-- ------------------------------------------------------------
create function public.pending_review_orders(p_prompt_only boolean default true)
returns table (
  order_id uuid,
  order_number text,
  delivered_at timestamptz,
  items jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select o.id, o.order_number::text, s.actual_delivery_date,
         (select jsonb_agg(jsonb_build_object(
                    'name', oi.product_name_snapshot,
                    'variant', oi.variant_label_snapshot,
                    'image', oi.image_url_snapshot,
                    'quantity', oi.quantity) order by oi.created_at)
          from public.order_items oi where oi.order_id = o.id)
  from public.orders o
  left join public.shipments s on s.order_id = o.id
  where o.profile_id = (select auth.uid())
    and o.shipping_status = 'delivered'
    and not exists (select 1 from public.reviews r where r.order_id = o.id)
    and (not p_prompt_only or o.review_prompt_dismissed_at is null)
  order by coalesce(s.actual_delivery_date, o.updated_at) desc
  limit 5
$$;

revoke execute on function public.pending_review_orders(boolean) from public, anon;
grant execute on function public.pending_review_orders(boolean) to authenticated, service_role;

create function public.dismiss_review_prompt(p_order_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.orders set review_prompt_dismissed_at = now()
  where id = p_order_id and profile_id = (select auth.uid()) and review_prompt_dismissed_at is null
$$;

revoke execute on function public.dismiss_review_prompt(uuid) from public, anon;
grant execute on function public.dismiss_review_prompt(uuid) to authenticated, service_role;

-- ------------------------------------------------------------
-- Baca publik: ulasan produk (cursor), ringkasan, ulasan pesanan milik sendiri.
-- ------------------------------------------------------------
create function public.list_product_reviews(
  p_product_id uuid,
  p_rating int default null,
  p_limit int default 5,
  p_before_at timestamptz default null,
  p_before_id uuid default null
)
returns table (
  id uuid,
  reviewer_name text,
  rating smallint,
  body text,
  variant_label text,
  photos text[],
  admin_reply text,
  admin_reply_at timestamptz,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.reviewer_name, r.rating, r.body, rp.variant_label,
         coalesce((select array_agg(ph.storage_path order by ph.sort_order)
                   from public.review_photos ph where ph.review_id = r.id), '{}'),
         r.admin_reply, r.admin_reply_at, r.created_at
  from public.review_products rp
  join public.reviews r on r.id = rp.review_id
  join public.products p on p.id = rp.product_id and p.is_active
  where rp.product_id = p_product_id
    and r.deleted_at is null
    and (p_rating is null or r.rating = p_rating)
    and (p_before_at is null
         or (r.created_at, r.id) < (p_before_at, coalesce(p_before_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)))
  order by r.created_at desc, r.id desc
  limit least(greatest(coalesce(p_limit, 5), 1), 20)
$$;

revoke execute on function public.list_product_reviews(uuid, int, int, timestamptz, uuid) from public;
grant execute on function public.list_product_reviews(uuid, int, int, timestamptz, uuid) to anon, authenticated, service_role;

create function public.product_rating_summary(p_product_id uuid)
returns table (rating_avg numeric, rating_count int, distribution jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select p.rating_avg, p.rating_count,
         (select jsonb_object_agg(star, coalesce(cnt, 0))
          from generate_series(1, 5) star
          left join (
            select r.rating, count(*)::int as cnt
            from public.review_products rp
            join public.reviews r on r.id = rp.review_id and r.deleted_at is null
            where rp.product_id = p_product_id
            group by r.rating
          ) d on d.rating = star)
  from public.products p
  where p.id = p_product_id and p.is_active
$$;

revoke execute on function public.product_rating_summary(uuid) from public;
grant execute on function public.product_rating_summary(uuid) to anon, authenticated, service_role;

create function public.my_order_review(p_order_id uuid)
returns table (rating smallint, body text, photos text[], admin_reply text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select r.rating, r.body,
         coalesce((select array_agg(ph.storage_path order by ph.sort_order)
                   from public.review_photos ph where ph.review_id = r.id), '{}'),
         r.admin_reply, r.created_at
  from public.reviews r
  join public.orders o on o.id = r.order_id
  where r.order_id = p_order_id and o.profile_id = (select auth.uid()) and r.deleted_at is null
$$;

revoke execute on function public.my_order_review(uuid) from public, anon;
grant execute on function public.my_order_review(uuid) to authenticated, service_role;

-- ------------------------------------------------------------
-- Admin: balas, hapus, impor.
-- ------------------------------------------------------------
create function public.admin_reply_review(p_review_id uuid, p_reply text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reply text := nullif(trim(coalesce(p_reply, '')), '');
begin
  perform private.assert_admin();
  if char_length(v_reply) > 1000 then
    raise exception 'review_too_long' using errcode = '22023';
  end if;
  update public.reviews
  set admin_reply = v_reply,
      admin_reply_by = case when v_reply is null then null else (select auth.uid()) end,
      admin_reply_at = case when v_reply is null then null else now() end
  where id = p_review_id and deleted_at is null;
  if not found then
    raise exception 'review_not_found' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function public.admin_reply_review(uuid, text) from public, anon;
grant execute on function public.admin_reply_review(uuid, text) to authenticated, service_role;

create function public.admin_delete_review(p_review_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.assert_admin();
  update public.reviews set deleted_at = now(), deleted_by = (select auth.uid())
  where id = p_review_id and deleted_at is null;
  if not found then
    raise exception 'review_not_found' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function public.admin_delete_review(uuid) from public, anon;
grant execute on function public.admin_delete_review(uuid) to authenticated, service_role;

create function public.admin_import_review(
  p_product_id uuid,
  p_reviewer_name text,
  p_rating int,
  p_body text default '',
  p_created_at timestamptz default null,
  p_photo_paths text[] default '{}',
  p_variant_label text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_name text := trim(coalesce(p_reviewer_name, ''));
  v_body text := trim(coalesce(p_body, ''));
  v_review_id uuid;
begin
  perform private.assert_admin();
  if not exists (select 1 from public.products where id = p_product_id) then
    raise exception 'product_not_found' using errcode = 'P0002';
  end if;
  if char_length(v_name) not between 1 and 100 then
    raise exception 'invalid_reviewer_name' using errcode = '22023';
  end if;
  if p_rating is null or p_rating not between 1 and 5 then
    raise exception 'invalid_rating' using errcode = '22023';
  end if;
  if char_length(v_body) > 1000 then
    raise exception 'review_too_long' using errcode = '22023';
  end if;
  if p_created_at is not null and p_created_at > now() then
    raise exception 'invalid_review_date' using errcode = '22023';
  end if;
  if not private.valid_review_photos(p_photo_paths, v_uid) then
    raise exception 'invalid_photos' using errcode = '22023';
  end if;

  insert into public.reviews (source, reviewer_name, rating, body, created_at)
  values ('imported', v_name, p_rating, v_body, coalesce(p_created_at, now()))
  returning id into v_review_id;

  insert into public.review_products (review_id, product_id, variant_label)
  values (v_review_id, p_product_id, nullif(trim(coalesce(p_variant_label, '')), ''));

  insert into public.review_photos (review_id, storage_path, sort_order)
  select v_review_id, path, (ord - 1)::smallint
  from unnest(coalesce(p_photo_paths, '{}')) with ordinality as t(path, ord);

  return v_review_id;
end;
$$;

revoke execute on function public.admin_import_review(uuid, text, int, text, timestamptz, text[], text) from public, anon;
grant execute on function public.admin_import_review(uuid, text, int, text, timestamptz, text[], text) to authenticated, service_role;

-- ------------------------------------------------------------
-- Katalog: rating di kartu produk (kolom baru di akhir view).
-- ------------------------------------------------------------
create or replace view public.product_listings
with (security_invoker = true)
as
select
  p.id,
  p.slug,
  p.name,
  p.category_id,
  p.created_at,
  min(v.price) as price_min,
  max(v.price) as price_max,
  (
    select pi.storage_path
    from public.product_images pi
    where pi.product_id = p.id
    order by (pi.variant_id is not null), pi.sort_order, pi.created_at
    limit 1
  ) as image_path,
  p.is_preorder,
  p.preorder_days,
  p.rating_avg,
  p.rating_count
from public.products p
join public.product_variants v on v.product_id = p.id and v.is_active
where p.is_active
group by p.id;
