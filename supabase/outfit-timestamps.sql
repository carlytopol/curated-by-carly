-- Keep outfit inserts safe across API clients and older schema revisions.
-- Safe to run more than once in the Supabase SQL editor.

alter table public.outfits
  alter column updated_at set default now();
