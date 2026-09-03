-- Personal Style Profile: private, versioned, user-owned records.
-- Apply in Supabase before enabling the Profile UI in production.

create table if not exists public.style_survey_response_sets (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  schema_version text not null,
  status text not null check (status in ('not_started','in_progress','core_complete','complete','archived')),
  answers jsonb not null default '{}'::jsonb,
  skipped_question_ids text[] not null default '{}',
  started_at timestamptz,
  core_completed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists style_survey_response_sets_user_updated_idx on public.style_survey_response_sets(user_id, updated_at desc);

create table if not exists public.explicit_style_preferences (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  response_set_id uuid references public.style_survey_response_sets(id) on delete set null,
  question_id text not null,
  subject text not null,
  value jsonb not null,
  scope jsonb not null default '{}'::jsonb,
  provenance text not null check (provenance in ('survey','confirmed-correction')),
  schema_version text not null,
  version bigint not null,
  active boolean not null default true,
  effective_at timestamptz not null default now(),
  superseded_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists explicit_style_preferences_active_idx on public.explicit_style_preferences(user_id, active, subject);

create table if not exists public.explicit_style_notes (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  response_set_id uuid references public.style_survey_response_sets(id) on delete cascade,
  question_id text not null,
  note text not null check (char_length(note) <= 500),
  active boolean not null default true,
  effective_at timestamptz not null default now(),
  superseded_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists explicit_style_notes_user_idx on public.explicit_style_notes(user_id, active);

create table if not exists public.observed_style_signals (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  signal_type text not null,
  subject text not null,
  value text not null,
  context jsonb not null default '{}'::jsonb,
  source_record_type text not null,
  source_record_id uuid,
  strength text not null check (strength in ('low','medium','high')),
  occurred_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists observed_style_signals_user_subject_idx on public.observed_style_signals(user_id, subject, occurred_at desc);

create table if not exists public.inferred_style_preferences (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  value text not null,
  scope jsonb not null default '{}'::jsonb,
  confidence text not null check (confidence in ('low','medium','high')),
  evidence_summary text not null,
  evidence_signal_ids uuid[] not null default '{}',
  review_state text not null check (review_state in ('proposed','confirmed','dismissed','deferred','conflicted')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists inferred_style_preferences_review_idx on public.inferred_style_preferences(user_id, review_state, active);

create table if not exists public.style_learning_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  learning_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.style_survey_response_sets enable row level security;
alter table public.explicit_style_preferences enable row level security;
alter table public.explicit_style_notes enable row level security;
alter table public.observed_style_signals enable row level security;
alter table public.inferred_style_preferences enable row level security;
alter table public.style_learning_settings enable row level security;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'style_survey_response_sets',
    'explicit_style_preferences',
    'explicit_style_notes',
    'observed_style_signals',
    'inferred_style_preferences',
    'style_learning_settings'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', table_name || '_owner', table_name);
    execute format(
      'create policy %I on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      table_name || '_owner',
      table_name
    );
  end loop;
end $$;

revoke all on public.style_survey_response_sets from anon;
revoke all on public.explicit_style_preferences from anon;
revoke all on public.explicit_style_notes from anon;
revoke all on public.observed_style_signals from anon;
revoke all on public.inferred_style_preferences from anon;
revoke all on public.style_learning_settings from anon;
grant select, insert, update, delete on public.style_survey_response_sets to authenticated;
grant select, insert, update, delete on public.explicit_style_preferences to authenticated;
grant select, insert, update, delete on public.explicit_style_notes to authenticated;
grant select, insert, update, delete on public.observed_style_signals to authenticated;
grant select, insert, update, delete on public.inferred_style_preferences to authenticated;
grant select, insert, update, delete on public.style_learning_settings to authenticated;

alter table public.outfit_recommendations
  add column if not exists preference_snapshot jsonb;
