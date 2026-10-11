-- #24 — profiles, addresses, store_settings + trigger handle_new_user.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (char_length(full_name) <= 120),
  avatar_url text,
  role public.user_role not null default 'customer',
  phone text check (phone ~ '^\+?[0-9]{8,15}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.profiles.role is
  'Hanya bisa diubah lewat RPC admin_set_role (column grant tidak mencakup role).';

create index profiles_role_idx on public.profiles (role);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

-- ------------------------------------------------------------

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  label varchar(50),
  recipient_name text not null check (char_length(recipient_name) between 1 and 120),
  phone text not null check (phone ~ '^\+?[0-9]{8,15}$'),
  address_line text not null check (char_length(address_line) between 5 and 500),
  district text,
  city text not null,
  province text not null,
  postal_code varchar(10) not null check (postal_code ~ '^[0-9]{5}$'),
  biteship_area_id varchar(100),
  latitude numeric(10, 7) check (latitude between -90 and 90),
  longitude numeric(10, 7) check (longitude between -180 and 180),
  note text check (char_length(note) <= 200),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index addresses_profile_id_idx on public.addresses (profile_id);
create unique index addresses_one_default_per_profile
  on public.addresses (profile_id) where is_default;

create trigger addresses_set_updated_at
  before update on public.addresses
  for each row execute function private.set_updated_at();

-- ------------------------------------------------------------

create table public.store_settings (
  id uuid primary key default gen_random_uuid(),
  store_name text not null,
  contact_name text not null,
  phone text not null check (phone ~ '^\+?[0-9]{8,15}$'),
  address_line text not null,
  city text not null,
  province text not null,
  postal_code varchar(10) not null check (postal_code ~ '^[0-9]{5}$'),
  biteship_area_id varchar(100) not null,
  latitude numeric(10, 7) check (latitude between -90 and 90),
  longitude numeric(10, 7) check (longitude between -180 and 180),
  note text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index store_settings_one_active on public.store_settings ((true)) where is_active;

create trigger store_settings_set_updated_at
  before update on public.store_settings
  for each row execute function private.set_updated_at();

-- ------------------------------------------------------------
-- Profile otomatis saat signup (email/password maupun Google OAuth).
-- Google mengisi raw_user_meta_data dengan full_name/name dan avatar_url/picture.
-- ------------------------------------------------------------
create function private.handle_new_user()
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
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- User yang sudah ada sebelum migrasi ini.
insert into public.profiles (id, full_name, avatar_url)
select
  u.id,
  left(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'), 120),
  coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture')
from auth.users u
on conflict (id) do nothing;
