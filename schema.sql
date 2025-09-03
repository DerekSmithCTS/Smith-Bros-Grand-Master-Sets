-- Run this in Supabase (SQL editor), then click RUN
create table if not exists collections (
  id text primary key,
  name text,
  created_at timestamp with time zone default now()
);

create table if not exists items (
  id text primary key,
  collection_id text references collections(id) on delete cascade,
  pokemon text check (pokemon in ('Mew','Rayquaza')),
  category text,
  name text,
  code text,
  owned boolean default false,
  purchase_price numeric,
  market_price numeric,
  qty integer default 1,
  notes text,
  created_at timestamp with time zone default now()
);

alter table collections enable row level security;
alter table items enable row level security;

-- Simple share-by-link read/write (fine for private hobby use)
create policy if not exists collections_rw on collections for all
  using (true) with check (true);
create policy if not exists items_rw on items for all
  using (true) with check (true);
