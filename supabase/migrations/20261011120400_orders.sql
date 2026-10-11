-- #27 — Order & transaksi. Semua penulisan lewat RPC / service role.

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number varchar(30) not null unique default private.generate_order_number(),
  -- restrict: user yang punya riwayat order tidak bisa dihapus begitu saja.
  profile_id uuid not null references public.profiles (id) on delete restrict,
  subtotal bigint not null check (subtotal >= 0),
  shipping_cost bigint not null default 0 check (shipping_cost >= 0),
  total_amount bigint not null,
  payment_status public.payment_status not null default 'pending_payment',
  shipping_status public.shipping_status,
  courier_code varchar(50) not null,
  courier_service varchar(50) not null,
  shipping_address_snapshot jsonb not null,
  customer_note text check (char_length(customer_note) <= 500),
  expires_at timestamptz not null,
  attention_reason public.attention_reason,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_total_matches check (total_amount = subtotal + shipping_cost)
);

create index orders_profile_created_idx on public.orders (profile_id, created_at desc);
create index orders_payment_status_idx on public.orders (payment_status);
create index orders_shipping_status_idx on public.orders (shipping_status);
create index orders_created_at_idx on public.orders (created_at desc);
create index orders_expiry_idx on public.orders (expires_at) where payment_status = 'pending_payment';
create index orders_attention_idx on public.orders (attention_reason) where attention_reason is not null;

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function private.set_updated_at();

-- ------------------------------------------------------------

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  variant_id uuid not null references public.product_variants (id) on delete restrict,
  quantity int not null check (quantity > 0),
  price_at_purchase bigint not null check (price_at_purchase >= 0),
  weight_gram_snapshot int not null check (weight_gram_snapshot > 0),
  product_name_snapshot text not null,
  variant_label_snapshot text,
  image_url_snapshot text,
  created_at timestamptz not null default now()
);

create index order_items_order_id_idx on public.order_items (order_id);
create index order_items_variant_id_idx on public.order_items (variant_id);

-- ------------------------------------------------------------

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete restrict,
  gateway varchar(20) not null default 'midtrans',
  gateway_order_id varchar(100) not null unique,
  gateway_transaction_id varchar(100) unique,
  snap_token text,
  payment_type varchar(30),
  payment_channel varchar(30),
  amount bigint not null check (amount > 0),
  status public.payment_attempt_status not null default 'pending',
  expires_at timestamptz not null,
  raw_response jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index payments_order_id_idx on public.payments (order_id);
create index payments_gateway_type_idx on public.payments (gateway, payment_type);
-- Maks. satu attempt pending per order (cegah bayar dobel).
create unique index payments_one_pending_per_order on public.payments (order_id) where status = 'pending';

create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function private.set_updated_at();

-- ------------------------------------------------------------

create table public.stock_reservations (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants (id) on delete restrict,
  order_id uuid not null references public.orders (id) on delete cascade,
  quantity int not null check (quantity > 0),
  status public.reservation_status not null default 'reserved',
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index stock_reservations_order_id_idx on public.stock_reservations (order_id);
-- Hitung stok tersedia & cleanup: hanya reservasi aktif.
create index stock_reservations_active_idx
  on public.stock_reservations (variant_id, expires_at) where status = 'reserved';
create index stock_reservations_cleanup_idx
  on public.stock_reservations (expires_at) where status = 'reserved';

create trigger stock_reservations_set_updated_at
  before update on public.stock_reservations
  for each row execute function private.set_updated_at();

-- ------------------------------------------------------------

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  status_type varchar(20) not null check (status_type in ('payment', 'shipping')),
  status_value varchar(30) not null,
  source varchar(20) not null check (source in ('midtrans', 'biteship', 'system')),
  -- Kunci idempotensi webhook: INSERT ... ON CONFLICT DO NOTHING.
  event_key varchar(150) not null,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  unique (source, event_key)
);

create index order_status_history_timeline_idx on public.order_status_history (order_id, created_at);

-- ------------------------------------------------------------

create table public.order_internal_notes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  admin_id uuid not null references public.profiles (id) on delete restrict,
  note text not null check (char_length(note) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index order_internal_notes_order_id_idx on public.order_internal_notes (order_id, created_at);

-- ------------------------------------------------------------

create table public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete restrict,
  biteship_order_id varchar(100) unique,
  courier_code varchar(50),
  courier_service varchar(50),
  waybill_id varchar(100),
  origin_address_snapshot jsonb not null,
  destination_address_snapshot jsonb not null,
  estimated_delivery_date date,
  actual_delivery_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index shipments_waybill_id_idx on public.shipments (waybill_id);

create trigger shipments_set_updated_at
  before update on public.shipments
  for each row execute function private.set_updated_at();
