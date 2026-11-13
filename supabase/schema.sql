-- HATOP starter schema for Supabase/PostgreSQL.
-- Review and add production-grade RLS policies before exposing data to clients.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  role text not null check (role in ('farmer','store','driver','admin')),
  village text,
  district text default 'Silaen',
  regency text default 'Toba',
  verification_status text not null default 'unverified' check (verification_status in ('unverified','pending','verified','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id),
  store_name text not null,
  address text not null,
  location_area text not null,
  verified boolean not null default false,
  subscription_status text not null default 'trial' check (subscription_status in ('trial','active','expired','suspended')),
  created_at timestamptz not null default now()
);

create table if not exists public.drivers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id),
  vehicle_type text not null,
  vehicle_plate text,
  verified boolean not null default false,
  capacity_kg numeric(10,2),
  availability_status text not null default 'offline' check (availability_status in ('offline','available','assigned','suspended')),
  created_at timestamptz not null default now()
);

create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null references public.profiles(id),
  recipient_name text not null,
  phone text,
  address_line text not null,
  village text not null,
  district text not null,
  regency text not null default 'Toba',
  delivery_notes text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id),
  sku text,
  name text not null,
  category text not null check (category in ('benih','pupuk','perlindungan','pakan','paket')),
  description text,
  unit text not null,
  price numeric(14,2) not null check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  weight_kg numeric(10,2) not null default 0 check (weight_kg >= 0),
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_code text not null unique,
  farmer_id uuid not null references public.profiles(id),
  address_id uuid references public.addresses(id),
  delivery_type text not null check (delivery_type in ('regular','express')),
  scheduled_date date,
  destination_text text not null,
  status text not null default 'waiting_payment' check (status in ('waiting_payment','waiting_stock','pooling','assigned','in_transit','inspection','cod_due','completed','needs_attention','cancelled')),
  pickup_cost numeric(14,2) not null default 0,
  shipping_share numeric(14,2) not null default 0,
  service_fee numeric(14,2) not null default 20000,
  express_fee numeric(14,2) not null default 0,
  product_subtotal numeric(14,2) not null default 0,
  dp_percent numeric(5,2) not null default 50,
  dp_amount numeric(14,2) not null default 0,
  cod_amount numeric(14,2) not null default 0,
  total_amount numeric(14,2) not null default 0,
  payment_method text check (payment_method in ('bank_transfer','qris')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id),
  product_name_snapshot text not null,
  unit_snapshot text not null,
  unit_price numeric(14,2) not null check (unit_price >= 0),
  quantity integer not null check (quantity > 0),
  weight_kg_snapshot numeric(10,2) not null default 0,
  line_total numeric(14,2) generated always as (unit_price * quantity) stored
);

create table if not exists public.pooling_groups (
  id uuid primary key default gen_random_uuid(),
  group_code text not null unique,
  destination_key text not null,
  scheduled_date date not null,
  pickup_cost numeric(14,2) not null,
  max_orders integer not null default 3 check (max_orders > 0),
  status text not null default 'open' check (status in ('open','locked','assigned','in_transit','completed','cancelled')),
  driver_id uuid references public.drivers(id),
  created_at timestamptz not null default now()
);

create table if not exists public.pooling_members (
  pooling_group_id uuid not null references public.pooling_groups(id) on delete cascade,
  order_id uuid not null unique references public.orders(id) on delete cascade,
  shipping_share numeric(14,2) not null,
  joined_at timestamptz not null default now(),
  primary key (pooling_group_id, order_id)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  payment_type text not null check (payment_type in ('dp_shipping','cod_settlement')),
  method text not null check (method in ('bank_transfer','qris','cash')),
  amount numeric(14,2) not null check (amount >= 0),
  status text not null default 'pending' check (status in ('pending','submitted','verified','rejected','settled','refunded')),
  evidence_path text,
  verified_by uuid references public.profiles(id),
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.delivery_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  event_type text not null,
  notes text,
  evidence_path text,
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id),
  farmer_id uuid not null references public.profiles(id),
  rating integer not null check (rating between 1 and 5),
  review_text text,
  created_at timestamptz not null default now()
);

create table if not exists public.loyalty_transactions (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null references public.profiles(id),
  order_id uuid references public.orders(id),
  points_delta integer not null,
  description text not null,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.vouchers (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid not null references public.profiles(id),
  code text not null unique,
  discount_amount numeric(14,2) not null,
  status text not null default 'available' check (status in ('available','used','expired')),
  expires_at timestamptz not null,
  used_order_id uuid references public.orders(id),
  created_at timestamptz not null default now()
);

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles(id),
  referred_id uuid not null references public.profiles(id),
  referral_code text not null,
  status text not null default 'pending' check (status in ('pending','qualified','rewarded','cancelled')),
  qualified_order_id uuid references public.orders(id),
  created_at timestamptz not null default now(),
  unique (referrer_id, referred_id)
);

create table if not exists public.complaints (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  reporter_id uuid not null references public.profiles(id),
  category text not null,
  description text not null,
  evidence_path text,
  status text not null default 'new' check (status in ('new','under_review','waiting_information','resolved','rejected')),
  assigned_admin_id uuid references public.profiles(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.platform_settings (
  setting_key text primary key,
  setting_value jsonb not null,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.financial_transactions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id),
  transaction_type text not null check (transaction_type in ('service_fee','express_fee','subscription','farming_package_fee','operating_expense','pickup_pass_through','incentive')),
  direction text not null check (direction in ('in','out')),
  amount numeric(14,2) not null check (amount >= 0),
  description text not null,
  occurred_at timestamptz not null default now(),
  created_by uuid references public.profiles(id)
);

create index if not exists idx_orders_farmer_created on public.orders(farmer_id, created_at desc);
create index if not exists idx_orders_status_schedule on public.orders(status, scheduled_date);
create index if not exists idx_products_store_active on public.products(store_id, active);
create index if not exists idx_pooling_date_status on public.pooling_groups(scheduled_date, status);
create index if not exists idx_payments_order_status on public.payments(order_id, status);
create index if not exists idx_delivery_events_order on public.delivery_events(order_id, created_at);

-- RLS is intentionally not enabled automatically here. Before production:
-- 1. Enable RLS on every table.
-- 2. Create policies for farmer-owned orders/addresses, store-owned products/orders,
--    assigned-driver deliveries, and admin-only management.
-- 3. Keep payment evidence in a private Storage bucket with signed URLs.
-- 4. Perform pricing, pooling assignment, payment verification, and role checks server-side.
