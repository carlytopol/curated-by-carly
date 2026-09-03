create table if not exists public.calendar_connections (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('google')),
  display_label text not null default 'Google Calendar',
  status text not null default 'active' check (status in ('active', 'needs_reauth', 'error', 'disconnecting')),
  granted_scopes text[] not null default '{}',
  last_synced_at timestamptz,
  last_error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists calendar_connections_user_provider_status_idx
  on public.calendar_connections (user_id, provider, status);

create table if not exists public.calendar_credentials (
  connection_id uuid primary key references public.calendar_connections(id) on delete cascade,
  encrypted_refresh_token text not null,
  refresh_token_iv text not null,
  refresh_token_tag text not null,
  encrypted_access_token text,
  access_token_iv text,
  access_token_tag text,
  access_token_expires_at timestamptz,
  key_version integer not null default 1,
  token_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.calendar_connections enable row level security;
alter table public.calendar_credentials enable row level security;

drop policy if exists "Users read their calendar connections" on public.calendar_connections;
create policy "Users read their calendar connections"
on public.calendar_connections for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users create their calendar connections" on public.calendar_connections;
create policy "Users create their calendar connections"
on public.calendar_connections for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users update their calendar connections" on public.calendar_connections;
create policy "Users update their calendar connections"
on public.calendar_connections for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete their calendar connections" on public.calendar_connections;
create policy "Users delete their calendar connections"
on public.calendar_connections for delete to authenticated
using ((select auth.uid()) = user_id);

-- Intentionally no anon/authenticated policies on calendar_credentials.
-- Only the server-only Supabase service-role client may access token ciphertext.
revoke all on table public.calendar_credentials from anon, authenticated;
