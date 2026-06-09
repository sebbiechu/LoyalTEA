-- Users table (both colleagues and managers)
create table users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  full_name text not null,
  pin_hash text not null, -- store hashed PIN
  role text not null default 'colleague', -- 'colleague' | 'manager'
  created_at timestamptz default now()
);

-- Stamps table
create table stamps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) not null,
  drink_type text not null, -- 'coffee', 'tea', 'mocha', 'iced', 'hot_chocolate', 'other'
  reusable_cup boolean default false,
  is_redemption boolean default false, -- true when this is a free drink redemption
  stamped_by uuid references users(id) not null, -- manager who issued it
  created_at timestamptz default now()
);

-- Drink types table (configurable by manager)
create table drink_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  emoji text not null,
  is_active boolean default true,
  display_order integer default 0
);

-- Insert default drink types
insert into drink_types (name, emoji, display_order) values
  ('Coffee', '☕', 1),
  ('Tea', '🍵', 2),
  ('Mocha', '🧋', 3),
  ('Iced Coffee', '🧊', 4),
  ('Hot Chocolate', '🍫', 5),
  ('Other', '☕', 6);
