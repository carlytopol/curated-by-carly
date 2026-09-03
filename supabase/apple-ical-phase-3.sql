alter table public.calendar_connections
  drop constraint if exists calendar_connections_provider_check;

alter table public.calendar_connections
  add constraint calendar_connections_provider_check
  check (provider in ('google', 'microsoft', 'ics'));

alter table public.calendar_connections
  add column if not exists provider_account_hash text;

create unique index if not exists calendar_connections_user_provider_account_hash_idx
  on public.calendar_connections (user_id, provider, provider_account_hash)
  where provider_account_hash is not null;

alter table public.calendar_connections
  drop constraint if exists calendar_connections_status_check;

alter table public.calendar_connections
  add constraint calendar_connections_status_check
  check (status in ('active', 'needs_reauth', 'invalid_link', 'unreachable_feed', 'error', 'disconnecting'));

alter table public.calendar_credentials
  alter column encrypted_refresh_token drop not null,
  alter column refresh_token_iv drop not null,
  alter column refresh_token_tag drop not null;

alter table public.calendar_credentials
  add column if not exists encrypted_subscription_url text,
  add column if not exists subscription_url_iv text,
  add column if not exists subscription_url_tag text;

-- Subscription URLs can act as bearer credentials. Browser roles retain no
-- privileges or RLS policy on this table; access remains service-key only.
revoke all on table public.calendar_credentials from anon, authenticated;
