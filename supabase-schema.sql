-- MakanMana — Supabase schema
-- Run this once in the Supabase dashboard: SQL Editor → New query → paste → Run.
--
-- Scope: user-generated data moves to the server (profiles, reviews, favourites,
-- bookings). The curated restaurant list stays in the app as static reference
-- data, so restaurant_id here is the app's own id ('1'..'5').
--
-- Authentication itself is handled by Supabase Auth (auth.users); we only keep
-- a profile row for the display name shown next to a review.

-- ── TABLES ───────────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id         uuid primary key references auth.users on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);

-- user_id references public.profiles (not auth.users) so that the Data API can
-- join a review to its author's display name in one query.
create table if not exists public.reviews (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id text not null,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  rating        int  not null check (rating between 1 and 5),
  body          text not null default '',
  created_at    timestamptz not null default now(),
  -- one review per person per restaurant; posting again updates the existing row
  unique (restaurant_id, user_id)
);

create table if not exists public.favourites (
  user_id       uuid not null references public.profiles(id) on delete cascade,
  restaurant_id text not null,
  created_at    timestamptz not null default now(),
  primary key (user_id, restaurant_id)
);

create table if not exists public.bookings (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  restaurant_id   text not null,
  restaurant_name text not null,
  day             text not null,
  slot_time       text not null,
  party_size      int  not null check (party_size between 1 and 12),
  created_at      timestamptz not null default now()
);

create index if not exists reviews_restaurant_idx    on public.reviews (restaurant_id);
create index if not exists favourites_user_idx       on public.favourites (user_id);
create index if not exists bookings_user_idx         on public.bookings (user_id);

-- ── ROW LEVEL SECURITY ───────────────────────────────────────────────────────
-- This is what enforces NFR7 (privacy) at the database rather than trusting the
-- client. Reviews are readable by every signed-in user, because the community
-- rating depends on seeing everyone's reviews. Favourites and bookings are
-- visible only to the account that owns them.

alter table public.profiles   enable row level security;
alter table public.reviews    enable row level security;
alter table public.favourites enable row level security;
alter table public.bookings   enable row level security;

-- profiles: any signed-in user may read (to show a review author's name),
-- but only the owner may create or change their own row.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated using (true);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated using (auth.uid() = id);

-- reviews: communal read, owner-only write.
drop policy if exists reviews_select on public.reviews;
create policy reviews_select on public.reviews
  for select to authenticated using (true);

drop policy if exists reviews_insert_own on public.reviews;
create policy reviews_insert_own on public.reviews
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists reviews_update_own on public.reviews;
create policy reviews_update_own on public.reviews
  for update to authenticated using (auth.uid() = user_id);

drop policy if exists reviews_delete_own on public.reviews;
create policy reviews_delete_own on public.reviews
  for delete to authenticated using (auth.uid() = user_id);

-- favourites: entirely private to the owner.
drop policy if exists favourites_own on public.favourites;
create policy favourites_own on public.favourites
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- bookings: entirely private to the owner.
drop policy if exists bookings_own on public.bookings;
create policy bookings_own on public.bookings
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── PROFILE CREATION ─────────────────────────────────────────────────────────
-- Create the profile row automatically when someone signs up, taking the
-- display name from the metadata passed at sign-up. Doing this in a trigger
-- means the client cannot forget to do it, and cannot create a profile for
-- somebody else.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', 'User'));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
