-- Recommendation Architecture V2: isolated recommendation artifacts and cache.
-- Additive only. Canonical wardrobe/profile tables remain read-only inputs.

create table if not exists public.recommendation_runs_v2 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  daily_event_id uuid not null references public.daily_events(id) on delete cascade,
  request_id text not null check (length(btrim(request_id)) > 0),
  idempotency_key text not null check (length(btrim(idempotency_key)) > 0),
  engine_version text not null check (length(btrim(engine_version)) > 0),
  architecture_version text not null check (architecture_version = 'recommendation-architecture.v2'),
  brief_version text not null,
  posture_version text not null,
  adjudication_version text not null,
  correction_revision bigint not null default 0 check (correction_revision >= 0),
  suppression_revision bigint not null default 0 check (suppression_revision >= 0),
  outcome text not null check (outcome in ('recommend', 'revise-composition', 'ask-one-question', 'abstain')),
  customer_summary text,
  -- Bounded, structured decision artifacts only. Never store prompts or hidden reasoning.
  posture_artifact jsonb not null,
  adjudication_artifact jsonb not null,
  trace_artifact jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create table if not exists public.recommendation_options_v2 (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.recommendation_runs_v2(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  option_index integer not null check (option_index between 0 and 2),
  summary text not null check (length(btrim(summary)) > 0),
  rationale text not null check (length(btrim(rationale)) > 0),
  candidate_artifact jsonb not null,
  created_at timestamptz not null default now(),
  unique (run_id, option_index)
);

create table if not exists public.recommendation_option_items_v2 (
  option_id uuid not null references public.recommendation_options_v2(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid not null references public.clothing_items(id) on delete restrict,
  garment_role text not null check (length(btrim(garment_role)) > 0),
  position integer not null check (position >= 0),
  primary key (option_id, item_id),
  unique (option_id, garment_role, position)
);

create table if not exists public.recommendation_cache_v2 (
  partition_key text primary key check (length(btrim(partition_key)) > 0),
  user_id uuid not null references auth.users(id) on delete cascade,
  run_id uuid not null references public.recommendation_runs_v2(id) on delete cascade,
  engine_version text not null,
  architecture_version text not null check (architecture_version = 'recommendation-architecture.v2'),
  brief_version text not null,
  posture_version text not null,
  adjudication_version text not null,
  correction_revision bigint not null check (correction_revision >= 0),
  suppression_revision bigint not null check (suppression_revision >= 0),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create or replace function public.persist_recommendation_run_v2(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  target_user uuid := (payload->>'userId')::uuid;
  target_event uuid := (payload->>'dailyEventId')::uuid;
  event_owner uuid;
  current_correction_revision bigint := 0;
  current_suppression_revision bigint := 0;
  requested_correction_revision bigint := coalesce((payload->>'correctionRevision')::bigint, 0);
  requested_suppression_revision bigint := coalesce((payload->>'suppressionRevision')::bigint, 0);
  persisted_run_id uuid;
  option_value jsonb;
  option_id uuid;
  item_value jsonb;
  item_owner uuid;
begin
  if caller is null or caller is distinct from target_user then
    raise exception 'authenticated customer does not own target recommendation';
  end if;
  select user_id into event_owner from public.daily_events where id = target_event;
  if event_owner is distinct from target_user then
    raise exception 'daily event does not belong to authenticated customer';
  end if;
  select correction_revision, suppression_revision
    into current_correction_revision, current_suppression_revision
    from public.recommendation_customer_revisions_v2 where user_id = target_user;
  current_correction_revision := coalesce(current_correction_revision, 0);
  current_suppression_revision := coalesce(current_suppression_revision, 0);
  if requested_correction_revision <> current_correction_revision
    or requested_suppression_revision <> current_suppression_revision then
    raise exception 'recommendation memory revision is stale';
  end if;

  insert into public.recommendation_runs_v2 (
    user_id, daily_event_id, request_id, idempotency_key, engine_version,
    architecture_version, brief_version, posture_version, adjudication_version,
    correction_revision, suppression_revision, outcome, customer_summary,
    posture_artifact, adjudication_artifact, trace_artifact
  ) values (
    target_user, target_event, payload->>'requestId', payload->>'idempotencyKey',
    payload->>'engineVersion', payload->>'architectureVersion', payload->>'briefVersion',
    payload->>'postureVersion', payload->>'adjudicationVersion',
    requested_correction_revision, requested_suppression_revision, payload->>'outcome',
    nullif(payload->>'customerSummary', ''), payload->'postureArtifact',
    payload->'adjudicationArtifact', coalesce(payload->'traceArtifact', '{}'::jsonb)
  ) on conflict (user_id, idempotency_key) do update
    set idempotency_key = excluded.idempotency_key
  returning id into persisted_run_id;

  if not exists (
    select 1 from public.recommendation_options_v2
    where run_id = persisted_run_id
  ) then
    for option_value in select value from jsonb_array_elements(coalesce(payload->'options', '[]'::jsonb)) loop
      insert into public.recommendation_options_v2 (
        run_id, user_id, option_index, summary, rationale, candidate_artifact
      ) values (
        persisted_run_id, target_user, (option_value->>'optionIndex')::integer,
        option_value->>'summary', option_value->>'rationale', option_value->'candidateArtifact'
      ) returning id into option_id;
      for item_value in select value from jsonb_array_elements(coalesce(option_value->'items', '[]'::jsonb)) loop
        select user_id into item_owner from public.clothing_items where id = (item_value->>'itemId')::uuid;
        if item_owner is distinct from target_user then
          raise exception 'wardrobe item does not belong to authenticated customer';
        end if;
        insert into public.recommendation_option_items_v2 (
          option_id, user_id, item_id, garment_role, position
        ) values (
          option_id, target_user, (item_value->>'itemId')::uuid,
          item_value->>'garmentRole', (item_value->>'position')::integer
        );
      end loop;
    end loop;
  end if;
  return persisted_run_id;
end;
$$;

create or replace function public.put_recommendation_cache_v2(payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  target_user uuid := (payload->>'userId')::uuid;
  owned_run boolean;
  affected integer;
begin
  if caller is null or caller is distinct from target_user then
    raise exception 'authenticated customer does not own target cache';
  end if;
  select exists(
    select 1 from public.recommendation_runs_v2
    where id = (payload->>'runId')::uuid and user_id = target_user
  ) into owned_run;
  if not owned_run then raise exception 'recommendation run does not belong to authenticated customer'; end if;
  insert into public.recommendation_cache_v2 (
    partition_key, user_id, run_id, engine_version, architecture_version,
    brief_version, posture_version, adjudication_version,
    correction_revision, suppression_revision, expires_at
  ) values (
    payload->>'partitionKey', target_user, (payload->>'runId')::uuid,
    payload->>'engineVersion', payload->>'architectureVersion', payload->>'briefVersion',
    payload->>'postureVersion', payload->>'adjudicationVersion',
    (payload->>'correctionRevision')::bigint, (payload->>'suppressionRevision')::bigint,
    (payload->>'expiresAt')::timestamptz
  ) on conflict (partition_key) do update set
    run_id = excluded.run_id, expires_at = excluded.expires_at,
    correction_revision = excluded.correction_revision,
    suppression_revision = excluded.suppression_revision
  where recommendation_cache_v2.user_id = excluded.user_id;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'cache partition belongs to another customer'; end if;
end;
$$;

alter table public.recommendation_runs_v2 enable row level security;
alter table public.recommendation_options_v2 enable row level security;
alter table public.recommendation_option_items_v2 enable row level security;
alter table public.recommendation_cache_v2 enable row level security;

drop policy if exists recommendation_runs_v2_owner_read on public.recommendation_runs_v2;
create policy recommendation_runs_v2_owner_read on public.recommendation_runs_v2
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists recommendation_options_v2_owner_read on public.recommendation_options_v2;
create policy recommendation_options_v2_owner_read on public.recommendation_options_v2
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists recommendation_option_items_v2_owner_read on public.recommendation_option_items_v2;
create policy recommendation_option_items_v2_owner_read on public.recommendation_option_items_v2
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists recommendation_cache_v2_owner_read on public.recommendation_cache_v2;
create policy recommendation_cache_v2_owner_read on public.recommendation_cache_v2
  for select to authenticated using (auth.uid() = user_id and expires_at > now());

revoke all on public.recommendation_runs_v2 from anon, authenticated;
revoke all on public.recommendation_options_v2 from anon, authenticated;
revoke all on public.recommendation_option_items_v2 from anon, authenticated;
revoke all on public.recommendation_cache_v2 from anon, authenticated;
grant select on public.recommendation_runs_v2 to authenticated;
grant select on public.recommendation_options_v2 to authenticated;
grant select on public.recommendation_option_items_v2 to authenticated;
grant select on public.recommendation_cache_v2 to authenticated;
revoke all on function public.persist_recommendation_run_v2(jsonb) from public;
revoke all on function public.put_recommendation_cache_v2(jsonb) from public;
-- Remove Supabase's explicit API-role defaults as well as PUBLIC. These RPCs
-- are customer-owned authenticated mutation boundaries only.
revoke all on function public.persist_recommendation_run_v2(jsonb) from anon, service_role;
revoke all on function public.put_recommendation_cache_v2(jsonb) from anon, service_role;
grant execute on function public.persist_recommendation_run_v2(jsonb) to authenticated;
grant execute on function public.put_recommendation_cache_v2(jsonb) to authenticated;
