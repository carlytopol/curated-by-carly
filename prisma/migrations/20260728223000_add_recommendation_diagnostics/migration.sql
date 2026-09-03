create table if not exists public.recommendation_diagnostics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  daily_event_id uuid not null references public.daily_events(id) on delete cascade,
  recommendation_set_id uuid,
  engine_version text not null,
  diagnostic_version text not null,
  payload jsonb not null,
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now()
);

create index if not exists recommendation_diagnostics_user_created_idx
  on public.recommendation_diagnostics(user_id, created_at desc);
create index if not exists recommendation_diagnostics_expires_idx
  on public.recommendation_diagnostics(expires_at);

create table if not exists public.wardrobe_metadata_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  clothing_item_id uuid not null references public.clothing_items(id) on delete cascade,
  field_name text not null,
  suggested_value jsonb not null,
  confidence double precision not null check (confidence >= 0 and confidence <= 1),
  evidence text,
  provenance text not null,
  model_version text not null,
  status text not null check (status in ('inferred', 'needs_review', 'accepted', 'dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clothing_item_id, field_name, model_version)
);

create index if not exists wardrobe_metadata_suggestions_user_status_idx
  on public.wardrobe_metadata_suggestions(user_id, status, confidence);

create table if not exists public.outfit_knowledge_edges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_item_id uuid not null references public.clothing_items(id) on delete cascade,
  target_item_id uuid not null references public.clothing_items(id) on delete cascade,
  relationship text not null,
  context jsonb not null default '{}'::jsonb,
  context_hash text not null,
  weight double precision not null,
  confidence double precision not null check (confidence >= 0 and confidence <= 1),
  evidence_count integer not null check (evidence_count > 0),
  provenance text[] not null default '{}',
  graph_version text not null,
  last_observed_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source_item_id, target_item_id, relationship, context_hash)
);

create index if not exists outfit_knowledge_edges_user_relationship_idx
  on public.outfit_knowledge_edges(user_id, relationship, confidence);

alter table public.recommendation_diagnostics enable row level security;
alter table public.wardrobe_metadata_suggestions enable row level security;
alter table public.outfit_knowledge_edges enable row level security;

create policy "Owners read their recommendation diagnostics"
  on public.recommendation_diagnostics for select
  using (auth.uid() = user_id);
create policy "Owners insert their recommendation diagnostics"
  on public.recommendation_diagnostics for insert
  with check (auth.uid() = user_id);
create policy "Owners delete their recommendation diagnostics"
  on public.recommendation_diagnostics for delete
  using (auth.uid() = user_id);

create policy "Owners read their metadata suggestions"
  on public.wardrobe_metadata_suggestions for select
  using (auth.uid() = user_id);
create policy "Owners insert their metadata suggestions"
  on public.wardrobe_metadata_suggestions for insert
  with check (
    auth.uid() = user_id and exists (
      select 1 from public.clothing_items item
      where item.id = clothing_item_id and item.user_id = auth.uid()
    )
  );
create policy "Owners update their metadata suggestions"
  on public.wardrobe_metadata_suggestions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "Owners delete their metadata suggestions"
  on public.wardrobe_metadata_suggestions for delete
  using (auth.uid() = user_id);

create policy "Owners read their outfit knowledge"
  on public.outfit_knowledge_edges for select
  using (auth.uid() = user_id);
create policy "Owners insert their outfit knowledge"
  on public.outfit_knowledge_edges for insert
  with check (
    auth.uid() = user_id and exists (
      select 1 from public.clothing_items item
      where item.id = source_item_id and item.user_id = auth.uid()
    ) and exists (
      select 1 from public.clothing_items item
      where item.id = target_item_id and item.user_id = auth.uid()
    )
  );
create policy "Owners update their outfit knowledge"
  on public.outfit_knowledge_edges for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "Owners delete their outfit knowledge"
  on public.outfit_knowledge_edges for delete
  using (auth.uid() = user_id);

revoke all on public.recommendation_diagnostics from anon;
revoke all on public.wardrobe_metadata_suggestions from anon;
revoke all on public.outfit_knowledge_edges from anon;
