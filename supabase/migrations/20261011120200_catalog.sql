-- #25 — Katalog: kategori, produk, opsi, nilai opsi, varian, gambar.
-- Harga/stok/SKU/berat/dimensi ada di varian; setiap produk wajib >= 1 varian
-- (ditegakkan RPC admin_create_product, lihat migrasi rpc_admin).

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  slug varchar(100) not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  parent_id uuid references public.categories (id) on delete restrict,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  check (parent_id is distinct from id)
);

create index categories_parent_id_idx on public.categories (parent_id);

-- ------------------------------------------------------------

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete restrict,
  name text not null check (char_length(name) between 1 and 200),
  slug varchar(150) not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_category_id_idx on public.products (category_id);
create index products_is_active_idx on public.products (is_active);
create index products_name_trgm_idx on public.products using gin (name extensions.gin_trgm_ops);

create trigger products_set_updated_at
  before update on public.products
  for each row execute function private.set_updated_at();

-- ------------------------------------------------------------

create table public.product_options (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  name varchar(50) not null check (char_length(trim(name)) > 0),
  sort_order int not null default 0,
  unique (product_id, name)
);

create table public.product_option_values (
  id uuid primary key default gen_random_uuid(),
  option_id uuid not null references public.product_options (id) on delete cascade,
  value varchar(50) not null check (char_length(trim(value)) > 0),
  sort_order int not null default 0,
  unique (option_id, value)
);

-- ------------------------------------------------------------

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete restrict,
  sku varchar(50) not null unique,
  price bigint not null check (price >= 0),
  quantity int not null default 0 check (quantity >= 0),
  weight_gram int not null check (weight_gram > 0),
  length_cm int not null check (length_cm > 0),
  width_cm int not null check (width_cm > 0),
  height_cm int not null check (height_cm > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.product_variants.quantity is
  'Stok fisik. Tidak terbaca anon/authenticated (column grant); pakai get_variant_availability / admin_get_stock.';

create index product_variants_product_id_idx on public.product_variants (product_id);
create index product_variants_is_active_idx on public.product_variants (is_active);

create trigger product_variants_set_updated_at
  before update on public.product_variants
  for each row execute function private.set_updated_at();

create table public.product_variant_options (
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  option_value_id uuid not null references public.product_option_values (id) on delete cascade,
  primary key (variant_id, option_value_id)
);

create index product_variant_options_value_idx on public.product_variant_options (option_value_id);

-- ------------------------------------------------------------

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  variant_id uuid references public.product_variants (id) on delete set null,
  storage_path text not null,
  alt_text text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index product_images_product_id_idx on public.product_images (product_id);
create index product_images_variant_id_idx on public.product_images (variant_id);

-- ------------------------------------------------------------
-- Audit perubahan stok fisik (stok awal, koreksi admin).
-- ------------------------------------------------------------
create table public.stock_adjustments (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  delta int not null check (delta <> 0),
  quantity_after int not null check (quantity_after >= 0),
  reason text not null check (char_length(reason) between 1 and 200),
  admin_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index stock_adjustments_variant_idx on public.stock_adjustments (variant_id, created_at desc);
