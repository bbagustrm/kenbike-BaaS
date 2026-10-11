-- #26 — Cart persisten untuk user login (guest cart ada di localStorage).

create table public.carts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger carts_set_updated_at
  before update on public.carts
  for each row execute function private.set_updated_at();

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts (id) on delete cascade,
  -- Varian yang dihapus admin (belum pernah dipesan) ikut hilang dari cart.
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  quantity int not null check (quantity between 1 and 99),
  created_at timestamptz not null default now(),
  unique (cart_id, variant_id)
);

create index cart_items_variant_id_idx on public.cart_items (variant_id);

-- Cart dibuat bersama profile saat signup.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), 120),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  );
  insert into public.carts (profile_id) values (new.id);
  return new;
end;
$$;

insert into public.carts (profile_id)
select id from public.profiles
on conflict (profile_id) do nothing;
