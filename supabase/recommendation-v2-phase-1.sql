-- Recommendation Architecture V2, Phase 1 (revised)
-- Immutable, owner-isolated customer corrections and recommendation
-- suppressions. This migration is not connected to Current Preview or
-- Production recommendation paths.

create table if not exists public.recommendation_customer_revisions_v2 (
  user_id uuid primary key references auth.users(id) on delete cascade,
  correction_revision bigint not null default 0 check (correction_revision >= 0),
  suppression_revision bigint not null default 0 check (suppression_revision >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.recommendation_customer_service_audit_v2 (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null references auth.users(id) on delete cascade,
  actor_id text not null check (length(btrim(actor_id)) > 0),
  authorization_id text not null check (length(btrim(authorization_id)) > 0),
  reason text not null check (length(btrim(reason)) > 0),
  confirmation_channel text not null
    check (confirmation_channel in ('in-app', 'email', 'support-session')),
  action text not null check (
    action in (
      'create-correction',
      'create-suppression',
      'restore-correction',
      'restore-suppression'
    )
  ),
  record_kind text not null check (record_kind in ('correction', 'suppression')),
  record_id uuid not null,
  idempotency_key text not null check (length(btrim(idempotency_key)) > 0),
  created_at timestamptz not null default now(),
  unique (target_user_id, idempotency_key)
);

create table if not exists public.recommendation_corrections_v2 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  schema_version text not null check (schema_version = 'customer-memory-record.v2.2.0'),
  architecture_version text not null check (architecture_version = 'recommendation-architecture.v2'),
  status text not null default 'active'
    check (status in ('active', 'restored', 'superseded')),
  scope_kind text not null
    check (scope_kind in ('today-only', 'similar-contexts', 'until-restored')),
  scope_context jsonb not null,
  original_language text not null check (length(btrim(original_language)) > 0),
  directive jsonb not null,
  authority text not null
    check (authority in ('customer-current', 'authorized-customer-service')),
  revision bigint not null default 0 check (revision >= 0),
  idempotency_key text not null check (length(btrim(idempotency_key)) > 0),
  supersedes_record_id uuid references public.recommendation_corrections_v2(id),
  service_audit_id uuid references public.recommendation_customer_service_audit_v2(id),
  restored_at timestamptz,
  restored_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, idempotency_key),
  check (
    (status = 'active' and restored_at is null and restored_by is null)
    or (status in ('restored', 'superseded') and restored_at is not null and restored_by is not null)
  ),
  check (
    (authority = 'customer-current' and service_audit_id is null)
    or (authority = 'authorized-customer-service' and service_audit_id is not null)
  )
);

create table if not exists public.recommendation_suppressions_v2 (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid not null references public.clothing_items(id) on delete cascade,
  schema_version text not null check (schema_version = 'customer-memory-record.v2.2.0'),
  architecture_version text not null check (architecture_version = 'recommendation-architecture.v2'),
  status text not null default 'active'
    check (status in ('active', 'restored', 'superseded')),
  scope_kind text not null
    check (scope_kind in ('today-only', 'similar-contexts', 'until-restored')),
  scope_context jsonb not null,
  original_language text not null check (length(btrim(original_language)) > 0),
  authority text not null
    check (authority in ('customer-current', 'authorized-customer-service')),
  revision bigint not null default 0 check (revision >= 0),
  idempotency_key text not null check (length(btrim(idempotency_key)) > 0),
  supersedes_record_id uuid references public.recommendation_suppressions_v2(id),
  service_audit_id uuid references public.recommendation_customer_service_audit_v2(id),
  restored_at timestamptz,
  restored_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, idempotency_key),
  check (
    (status = 'active' and restored_at is null and restored_by is null)
    or (status in ('restored', 'superseded') and restored_at is not null and restored_by is not null)
  ),
  check (
    (authority = 'customer-current' and service_audit_id is null)
    or (authority = 'authorized-customer-service' and service_audit_id is not null)
  )
);

create or replace function public.is_canonical_iana_timezone_v2(value text)
returns boolean
language sql
stable
set search_path = public
as $$
  select value is not null
    and value <> ''
    and (
      value = 'UTC'
      or (
        position('/' in value) > 0
        and value not like 'US/%'
        and value not like 'Etc/%'
        and value not like 'posix/%'
        and value not like 'right/%'
      )
    )
    and exists (select 1 from pg_timezone_names where name = value);
$$;

create or replace function public.validate_recommendation_scope_v2(
  target_user_id uuid,
  scope_value jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  scope_kind text := (scope_value ->> 'kind');
  local_date date;
  event_owner uuid;
  confirmed_at timestamptz;
  description text;
begin
  if scope_kind = 'until-restored' then
    return;
  elsif scope_kind = 'today-only' then
    if scope_value->>'timezoneBehavior' <> 'fixed-at-creation' then
      raise exception 'today-only scope must be fixed at creation';
    end if;
    begin
      local_date := (scope_value->>'localDate')::date;
    exception when others then
      raise exception 'today-only scope requires a real calendar date';
    end;
    if to_char(local_date, 'YYYY-MM-DD') <> scope_value->>'localDate' then
      raise exception 'today-only scope requires a canonical calendar date';
    end if;
    if not public.is_canonical_iana_timezone_v2(scope_value->>'timezone') then
      raise exception 'today-only scope requires a canonical IANA timezone';
    end if;
    if nullif(scope_value->>'dailyEventId', '') is not null then
      select user_id into event_owner
      from public.daily_events
      where id = (scope_value->>'dailyEventId')::uuid;
      if event_owner is distinct from target_user_id then
        raise exception 'today-only event does not belong to target customer';
      end if;
    end if;
    return;
  elsif scope_kind = 'similar-contexts' then
    if scope_value#>>'{matcher,matcherVersion}' <> 'similar-context-matcher.v2.2.0'
      or scope_value#>>'{confirmation,matcherVersionPresented}' <> 'similar-context-matcher.v2.2.0'
    then
      raise exception 'unsupported or unpresented similar-context matcher';
    end if;
    if nullif(scope_value#>>'{matcher,occasion}', '') is null
      or (
        nullif(scope_value#>>'{matcher,dayCharacter}', '') is null
        and nullif(scope_value#>>'{matcher,socialStakes}', '') is null
      )
    then
      raise exception 'similar-context matcher is not specific enough';
    end if;
    if scope_value#>>'{confirmation,status}' <> 'confirmed'
      or scope_value#>>'{confirmation,confirmedByUserId}' <> target_user_id::text
    then
      raise exception 'similar-context scope requires target-customer confirmation';
    end if;
    begin
      confirmed_at := (scope_value#>>'{confirmation,confirmedAt}')::timestamptz;
    exception when others then
      raise exception 'similar-context confirmation timestamp is invalid';
    end;
    if confirmed_at is null then
      raise exception 'similar-context confirmation timestamp is required';
    end if;
    description := btrim(coalesce(scope_value#>>'{confirmation,plainLanguageDescription}', ''));
    if description = '' or lower(description) in ('similar contexts', 'similar occasions') then
      raise exception 'similar-context confirmation requires a specific customer-readable description';
    end if;
    return;
  end if;
  raise exception 'unsupported customer-memory scope';
end;
$$;

create or replace function public.bump_recommendation_memory_revision_v2()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_revision bigint;
begin
  insert into public.recommendation_customer_revisions_v2 (user_id)
  values (new.user_id)
  on conflict (user_id) do nothing;
  if tg_table_name = 'recommendation_corrections_v2' then
    update public.recommendation_customer_revisions_v2
      set correction_revision = correction_revision + 1, updated_at = now()
      where user_id = new.user_id
      returning correction_revision into next_revision;
  else
    update public.recommendation_customer_revisions_v2
      set suppression_revision = suppression_revision + 1, updated_at = now()
      where user_id = new.user_id
      returning suppression_revision into next_revision;
  end if;
  new.revision := next_revision;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.enforce_immutable_recommendation_memory_v2()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.id is distinct from old.id
    or new.user_id is distinct from old.user_id
    or new.schema_version is distinct from old.schema_version
    or new.architecture_version is distinct from old.architecture_version
    or new.scope_kind is distinct from old.scope_kind
    or new.scope_context is distinct from old.scope_context
    or new.original_language is distinct from old.original_language
    or new.authority is distinct from old.authority
    or new.idempotency_key is distinct from old.idempotency_key
    or new.supersedes_record_id is distinct from old.supersedes_record_id
    or new.service_audit_id is distinct from old.service_audit_id
    or (
      tg_table_name = 'recommendation_corrections_v2'
      and (to_jsonb(new) -> 'directive') is distinct from (to_jsonb(old) -> 'directive')
    )
    or (
      tg_table_name = 'recommendation_suppressions_v2'
      and (to_jsonb(new) ->> 'item_id') is distinct from (to_jsonb(old) ->> 'item_id')
    )
  then
    raise exception 'original recommendation-memory evidence is immutable; create a superseding record';
  end if;
  if old.status <> 'active' or new.status not in ('restored', 'superseded') then
    raise exception 'invalid recommendation-memory state transition';
  end if;
  if new.restored_at is null or nullif(btrim(new.restored_by), '') is null then
    raise exception 'restoration or supersession requires actor and timestamp';
  end if;
  return new;
end;
$$;

drop trigger if exists recommendation_corrections_immutable_v2 on public.recommendation_corrections_v2;
create trigger recommendation_corrections_immutable_v2
before update on public.recommendation_corrections_v2
for each row execute function public.enforce_immutable_recommendation_memory_v2();

drop trigger if exists recommendation_suppressions_immutable_v2 on public.recommendation_suppressions_v2;
create trigger recommendation_suppressions_immutable_v2
before update on public.recommendation_suppressions_v2
for each row execute function public.enforce_immutable_recommendation_memory_v2();

drop trigger if exists recommendation_corrections_revision_v2 on public.recommendation_corrections_v2;
create trigger recommendation_corrections_revision_v2
before insert or update of status on public.recommendation_corrections_v2
for each row execute function public.bump_recommendation_memory_revision_v2();

drop trigger if exists recommendation_suppressions_revision_v2 on public.recommendation_suppressions_v2;
create trigger recommendation_suppressions_revision_v2
before insert or update of status on public.recommendation_suppressions_v2
for each row execute function public.bump_recommendation_memory_revision_v2();

-- Customer RPC: auth.uid is the only permissible target. Direct table writes
-- are revoked below, so immutable mutations cannot be bypassed through RLS.
create or replace function public.customer_execute_recommendation_memory_v2(command jsonb)
returns table (
  record_id uuid,
  owner_user_id uuid,
  record_kind text,
  operation text,
  scope jsonb,
  correction_revision bigint,
  suppression_revision bigint,
  audit_record_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid := auth.uid();
  command_kind text := (command ->> 'kind');
  authorization_data jsonb := (command -> 'authorization');
  scope_value jsonb := (command -> 'scope');
  new_record_id uuid;
  target_record_id uuid;
  prior_record_id uuid;
  item_owner uuid;
begin
  if owner_id is null or (authorization_data ->> 'targetUserId') <> owner_id::text
    or (authorization_data #>> '{actor,kind}') <> 'customer'
    or (authorization_data #>> '{actor,actorUserId}') <> owner_id::text
  then
    raise exception 'customer authorization or ownership mismatch';
  end if;
  if (command ->> 'commandVersion') <> 'customer-memory-command.v2.2.0' then
    raise exception 'unsupported customer-memory command';
  end if;

  if command_kind in ('create-correction', 'create-suppression') then
    perform public.validate_recommendation_scope_v2(owner_id, scope_value);
    prior_record_id := nullif((command ->> 'supersedesRecordId'), '')::uuid;
    if command_kind = 'create-correction' then
      if (command #>> '{directive,kind}') not in (
        'item-instruction', 'quality-instruction', 'outfit-relationship',
        'current-intention', 'event-context', 'formality', 'ceremony', 'effort',
        'comfort', 'coverage', 'footwear', 'carrying', 'accessibility',
        'garment-fact', 'garment-occasion-role', 'outfit-direction', 'piece-change'
      ) then
        raise exception 'unsupported correction directive';
      end if;
      if prior_record_id is not null then
        update public.recommendation_corrections_v2
        set status = 'superseded', restored_at = now(), restored_by = owner_id::text
        where id = prior_record_id and user_id = owner_id and status = 'active';
        if not found then raise exception 'owned active correction to supersede was not found'; end if;
      end if;
      insert into public.recommendation_corrections_v2 (
        user_id, schema_version, architecture_version, scope_kind, scope_context,
        original_language, directive, authority, idempotency_key, supersedes_record_id
      ) values (
        owner_id, 'customer-memory-record.v2.2.0', 'recommendation-architecture.v2',
        (scope_value ->> 'kind'), scope_value, (command ->> 'originalLanguage'),
        (command -> 'directive'), 'customer-current',
        (authorization_data ->> 'idempotencyKey'), prior_record_id
      ) returning id into new_record_id;
      record_kind := 'correction';
    else
      select user_id into item_owner from public.clothing_items
      where id = (command ->> 'itemId')::uuid;
      if item_owner is distinct from owner_id then
        raise exception 'suppressed wardrobe item does not belong to customer';
      end if;
      if prior_record_id is not null then
        update public.recommendation_suppressions_v2
        set status = 'superseded', restored_at = now(), restored_by = owner_id::text
        where id = prior_record_id and user_id = owner_id and status = 'active';
        if not found then raise exception 'owned active suppression to supersede was not found'; end if;
      end if;
      insert into public.recommendation_suppressions_v2 (
        user_id, item_id, schema_version, architecture_version, scope_kind,
        scope_context, original_language, authority, idempotency_key,
        supersedes_record_id
      ) values (
        owner_id, (command ->> 'itemId')::uuid, 'customer-memory-record.v2.2.0',
        'recommendation-architecture.v2', (scope_value ->> 'kind'), scope_value,
        (command ->> 'originalLanguage'), 'customer-current',
        (authorization_data ->> 'idempotencyKey'), prior_record_id
      ) returning id into new_record_id;
      record_kind := 'suppression';
    end if;
    operation := case when prior_record_id is null then 'created' else 'superseded' end;
  elsif command_kind in ('restore-correction', 'restore-suppression') then
    target_record_id := (command ->> 'recordId')::uuid;
    if command_kind = 'restore-correction' then
      update public.recommendation_corrections_v2
      set status = 'restored', restored_at = now(), restored_by = owner_id::text
      where id = target_record_id and user_id = owner_id and status = 'active'
      returning id, scope_context into new_record_id, scope_value;
      record_kind := 'correction';
    else
      update public.recommendation_suppressions_v2
      set status = 'restored', restored_at = now(), restored_by = owner_id::text
      where id = target_record_id and user_id = owner_id and status = 'active'
      returning id, scope_context into new_record_id, scope_value;
      record_kind := 'suppression';
    end if;
    if new_record_id is null then raise exception 'owned active record to restore was not found'; end if;
    operation := 'restored';
  else
    raise exception 'unsupported customer-memory operation';
  end if;

  select revisions.correction_revision, revisions.suppression_revision
    into customer_execute_recommendation_memory_v2.correction_revision,
         customer_execute_recommendation_memory_v2.suppression_revision
  from public.recommendation_customer_revisions_v2 as revisions
  where revisions.user_id = owner_id;
  record_id := new_record_id;
  owner_user_id := owner_id;
  scope := scope_value;
  audit_record_id := null;
  return next;
end;
$$;

-- Authorized customer-service RPC: the audit insert and memory mutation share
-- this single database transaction. Any validation or audit failure rolls back
-- both. External evidence services receive no EXECUTE grant.
create or replace function public.service_execute_recommendation_memory_v2(command jsonb)
returns table (
  record_id uuid,
  owner_user_id uuid,
  record_kind text,
  operation text,
  scope jsonb,
  correction_revision bigint,
  suppression_revision bigint,
  audit_record_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_id uuid := (command #>> '{authorization,targetUserId}')::uuid;
  actor jsonb := (command #> '{authorization,actor}');
  command_kind text := (command ->> 'kind');
  scope_value jsonb := (command -> 'scope');
  new_record_id uuid := coalesce(nullif((command ->> 'recordId'), '')::uuid, gen_random_uuid());
  new_audit_id uuid := gen_random_uuid();
  prior_record_id uuid := nullif((command ->> 'supersedesRecordId'), '')::uuid;
  item_owner uuid;
begin
  if auth.role() <> 'service_role'
    or (actor ->> 'kind') <> 'authorized-customer-service'
    or (actor ->> 'targetUserId') <> owner_id::text
    or nullif(btrim((actor ->> 'actorId')), '') is null
    or nullif(btrim((actor ->> 'authorizationId')), '') is null
    or nullif(btrim((actor ->> 'reason')), '') is null
  then
    raise exception 'authorized customer-service boundary failed';
  end if;
  if (command ->> 'commandVersion') <> 'customer-memory-command.v2.2.0' then
    raise exception 'unsupported customer-memory command';
  end if;

  insert into public.recommendation_customer_service_audit_v2 (
    id, target_user_id, actor_id, authorization_id, reason,
    confirmation_channel, action, record_kind, record_id, idempotency_key
  ) values (
    new_audit_id, owner_id, (actor ->> 'actorId'), (actor ->> 'authorizationId'),
    (actor ->> 'reason'), (actor ->> 'confirmationChannel'), command_kind,
    case when command_kind like '%suppression' then 'suppression' else 'correction' end,
    new_record_id, (command #>> '{authorization,idempotencyKey}')
  );

  if command_kind in ('create-correction', 'create-suppression') then
    perform public.validate_recommendation_scope_v2(owner_id, scope_value);
    if command_kind = 'create-correction' then
      if (command #>> '{directive,kind}') not in (
        'item-instruction', 'quality-instruction', 'outfit-relationship',
        'current-intention', 'event-context', 'formality', 'ceremony', 'effort',
        'comfort', 'coverage', 'footwear', 'carrying', 'accessibility',
        'garment-fact', 'garment-occasion-role', 'outfit-direction', 'piece-change'
      ) then
        raise exception 'unsupported correction directive';
      end if;
      if prior_record_id is not null then
        update public.recommendation_corrections_v2
        set status = 'superseded', restored_at = now(), restored_by = (actor ->> 'actorId')
        where id = prior_record_id and user_id = owner_id and status = 'active';
        if not found then raise exception 'owned active correction to supersede was not found'; end if;
      end if;
      insert into public.recommendation_corrections_v2 (
        id, user_id, schema_version, architecture_version, scope_kind,
        scope_context, original_language, directive, authority, idempotency_key,
        supersedes_record_id, service_audit_id
      ) values (
        new_record_id, owner_id, 'customer-memory-record.v2.2.0',
        'recommendation-architecture.v2', (scope_value ->> 'kind'), scope_value,
        (command ->> 'originalLanguage'), (command -> 'directive'),
        'authorized-customer-service', (command #>> '{authorization,idempotencyKey}'),
        prior_record_id, new_audit_id
      );
      record_kind := 'correction';
    else
      select user_id into item_owner from public.clothing_items
      where id = (command ->> 'itemId')::uuid;
      if item_owner is distinct from owner_id then
        raise exception 'suppressed wardrobe item does not belong to target customer';
      end if;
      if prior_record_id is not null then
        update public.recommendation_suppressions_v2
        set status = 'superseded', restored_at = now(), restored_by = (actor ->> 'actorId')
        where id = prior_record_id and user_id = owner_id and status = 'active';
        if not found then raise exception 'owned active suppression to supersede was not found'; end if;
      end if;
      insert into public.recommendation_suppressions_v2 (
        id, user_id, item_id, schema_version, architecture_version, scope_kind,
        scope_context, original_language, authority, idempotency_key,
        supersedes_record_id, service_audit_id
      ) values (
        new_record_id, owner_id, (command ->> 'itemId')::uuid,
        'customer-memory-record.v2.2.0', 'recommendation-architecture.v2',
        (scope_value ->> 'kind'), scope_value, (command ->> 'originalLanguage'),
        'authorized-customer-service', (command #>> '{authorization,idempotencyKey}'),
        prior_record_id, new_audit_id
      );
      record_kind := 'suppression';
    end if;
    operation := case when prior_record_id is null then 'created' else 'superseded' end;
  elsif command_kind in ('restore-correction', 'restore-suppression') then
    if command_kind = 'restore-correction' then
      update public.recommendation_corrections_v2
      set status = 'restored', restored_at = now(), restored_by = (actor ->> 'actorId')
      where id = new_record_id and user_id = owner_id and status = 'active'
      returning scope_context into scope_value;
      record_kind := 'correction';
    else
      update public.recommendation_suppressions_v2
      set status = 'restored', restored_at = now(), restored_by = (actor ->> 'actorId')
      where id = new_record_id and user_id = owner_id and status = 'active'
      returning scope_context into scope_value;
      record_kind := 'suppression';
    end if;
    if scope_value is null then raise exception 'owned active record to restore was not found'; end if;
    operation := 'restored';
  else
    raise exception 'unsupported customer-service operation';
  end if;

  select revisions.correction_revision, revisions.suppression_revision
    into service_execute_recommendation_memory_v2.correction_revision,
         service_execute_recommendation_memory_v2.suppression_revision
  from public.recommendation_customer_revisions_v2 as revisions
  where revisions.user_id = owner_id;
  record_id := new_record_id;
  owner_user_id := owner_id;
  scope := scope_value;
  audit_record_id := new_audit_id;
  return next;
end;
$$;

alter table public.recommendation_customer_revisions_v2 enable row level security;
alter table public.recommendation_corrections_v2 enable row level security;
alter table public.recommendation_suppressions_v2 enable row level security;
alter table public.recommendation_customer_service_audit_v2 enable row level security;

drop policy if exists "Customers read their V2 recommendation revisions" on public.recommendation_customer_revisions_v2;
create policy "Customers read their V2 recommendation revisions"
on public.recommendation_customer_revisions_v2 for select
to authenticated using (auth.uid() = user_id);
drop policy if exists "Customers read their V2 corrections" on public.recommendation_corrections_v2;
create policy "Customers read their V2 corrections"
on public.recommendation_corrections_v2 for select
to authenticated using (auth.uid() = user_id);
drop policy if exists "Customers read their V2 suppressions" on public.recommendation_suppressions_v2;
create policy "Customers read their V2 suppressions"
on public.recommendation_suppressions_v2 for select
to authenticated using (auth.uid() = user_id);
drop policy if exists "Customers read authorized service actions for themselves" on public.recommendation_customer_service_audit_v2;
create policy "Customers read authorized service actions for themselves"
on public.recommendation_customer_service_audit_v2 for select
to authenticated using (auth.uid() = target_user_id);

-- Remove obsolete whole-row mutation policies from any earlier Phase 1 draft.
drop policy if exists "Customers create their V2 corrections" on public.recommendation_corrections_v2;
drop policy if exists "Customers restore their V2 corrections" on public.recommendation_corrections_v2;
drop policy if exists "Customers create their V2 suppressions" on public.recommendation_suppressions_v2;
drop policy if exists "Customers restore their V2 suppressions" on public.recommendation_suppressions_v2;

revoke insert, update, delete on public.recommendation_customer_revisions_v2 from authenticated, service_role;
revoke insert, update, delete on public.recommendation_corrections_v2 from authenticated, service_role;
revoke insert, update, delete on public.recommendation_suppressions_v2 from authenticated, service_role;
revoke insert, update, delete on public.recommendation_customer_service_audit_v2 from authenticated, service_role;
grant select on public.recommendation_customer_revisions_v2 to authenticated;
grant select on public.recommendation_corrections_v2 to authenticated;
grant select on public.recommendation_suppressions_v2 to authenticated;
grant select on public.recommendation_customer_service_audit_v2 to authenticated;
revoke all on function public.customer_execute_recommendation_memory_v2(jsonb) from public;
revoke all on function public.service_execute_recommendation_memory_v2(jsonb) from public;
-- Supabase projects may carry explicit default EXECUTE grants for API roles in
-- addition to PUBLIC. Remove those grants before restoring the two intended
-- authority paths.
revoke all on function public.customer_execute_recommendation_memory_v2(jsonb) from anon, service_role;
revoke all on function public.service_execute_recommendation_memory_v2(jsonb) from anon, authenticated;
grant execute on function public.customer_execute_recommendation_memory_v2(jsonb) to authenticated;
grant execute on function public.service_execute_recommendation_memory_v2(jsonb) to service_role;

create index if not exists recommendation_corrections_v2_active_idx
  on public.recommendation_corrections_v2 (user_id, status, scope_kind);
create index if not exists recommendation_suppressions_v2_active_idx
  on public.recommendation_suppressions_v2 (user_id, status, scope_kind, item_id);
create index if not exists recommendation_customer_service_audit_v2_target_idx
  on public.recommendation_customer_service_audit_v2 (target_user_id, created_at desc);
