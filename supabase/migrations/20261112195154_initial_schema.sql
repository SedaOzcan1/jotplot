-- Jotplot initial schema (T0.4), based on PROJECT.md section 5.
--
-- Every table has id, user_id, and created_at, and Row Level Security so a user only reaches
-- their own rows. Child rows reference parents through (id, user_id) composite keys, so a row can
-- never point at another user's source or board.
--
-- Tables written only by Edge Functions (service role) are read-only for signed-in users:
-- usage, transcripts, and chunks. profiles.plan is also server-only.
--
-- Deferred: subscriptions and payment_events (Faz 5), integrations (F4).

create extension if not exists vector with schema extensions;

-- Shared helpers -------------------------------------------------------------------------------

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- profiles -------------------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique default auth.uid() references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 100),
  default_mode text not null default 'work' check (default_mode in ('work', 'student')),
  plan text not null default 'free' check (plan in ('free', 'premium')),
  plan_renews_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.profiles.plan is
  'Single source of truth for the plan. Changed only by the server (service role).';

-- usage ----------------------------------------------------------------------------------------

create table public.usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  period date not null check (period = date_trunc('month', period)::date),
  stt_minutes numeric(10, 2) not null default 0 check (stt_minutes >= 0),
  ai_requests integer not null default 0 check (ai_requests >= 0),
  tokens_in bigint not null default 0 check (tokens_in >= 0),
  tokens_out bigint not null default 0 check (tokens_out >= 0),
  cost_usd numeric(12, 6) not null default 0 check (cost_usd >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, period)
);

comment on column public.usage.period is 'First day of the month this row counts.';

-- sources --------------------------------------------------------------------------------------

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type text not null check (type in ('text', 'audio', 'pdf')),
  title text check (char_length(title) <= 200),
  mode text not null default 'work' check (mode in ('work', 'student')),
  storage_path text,
  raw_text text,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'ready', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create index sources_user_id_created_at_idx on public.sources (user_id, created_at desc);

-- transcripts ----------------------------------------------------------------------------------

create table public.transcripts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  source_id uuid not null,
  text text not null,
  language text,
  duration_sec numeric(10, 2) check (duration_sec >= 0),
  segments jsonb not null default '[]'::jsonb check (jsonb_typeof(segments) = 'array'),
  created_at timestamptz not null default now(),
  foreign key (source_id, user_id) references public.sources (id, user_id) on delete cascade
);

create index transcripts_source_id_idx on public.transcripts (source_id);
create index transcripts_user_id_idx on public.transcripts (user_id);

-- summaries ------------------------------------------------------------------------------------

create table public.summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  source_id uuid not null,
  summary text not null default '',
  decisions jsonb not null default '[]'::jsonb check (jsonb_typeof(decisions) = 'array'),
  concepts jsonb not null default '[]'::jsonb check (jsonb_typeof(concepts) = 'array'),
  questions jsonb not null default '[]'::jsonb check (jsonb_typeof(questions) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (source_id, user_id) references public.sources (id, user_id) on delete cascade
);

create index summaries_source_id_idx on public.summaries (source_id);
create index summaries_user_id_idx on public.summaries (user_id);

-- boards ---------------------------------------------------------------------------------------

create table public.boards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  mode text not null default 'work' check (mode in ('work', 'student')),
  course_name text,
  color text,
  columns jsonb not null default
    '[{"key":"todo","title":"Yapılacak"},{"key":"doing","title":"Devam Ediyor"},{"key":"done","title":"Tamamlandı"}]'::jsonb
    check (jsonb_typeof(columns) = 'array'),
  is_default boolean not null default false,
  jira_project_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id)
);

create index boards_user_id_idx on public.boards (user_id);
create unique index boards_one_default_per_mode_idx
  on public.boards (user_id, mode) where is_default;

-- tasks ----------------------------------------------------------------------------------------

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  board_id uuid not null,
  source_id uuid,
  title text not null check (char_length(title) between 1 and 300),
  type text not null default 'task'
    check (type in ('task', 'assignment', 'exam', 'study_topic')),
  assignee text,
  due_date date,
  status text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  position double precision not null default 0,
  external_provider text check (external_provider in ('jira')),
  external_id text,
  external_url text,
  calendar_event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (board_id, user_id) references public.boards (id, user_id) on delete cascade,
  -- Deleting a note keeps its tasks; only the link to the note is cleared.
  foreign key (source_id, user_id) references public.sources (id, user_id)
    on delete set null (source_id)
);

create index tasks_board_id_status_position_idx on public.tasks (board_id, status, position);
create index tasks_source_id_idx on public.tasks (source_id);
create index tasks_user_id_idx on public.tasks (user_id);

-- chunks (RAG) ---------------------------------------------------------------------------------

create table public.chunks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  source_id uuid not null,
  chunk_index integer not null check (chunk_index >= 0),
  content text not null,
  -- Dimension and vector index are added once the embedding provider is chosen (open decision).
  embedding extensions.vector,
  created_at timestamptz not null default now(),
  unique (source_id, chunk_index),
  foreign key (source_id, user_id) references public.sources (id, user_id) on delete cascade
);

create index chunks_user_id_idx on public.chunks (user_id);

-- chat_messages --------------------------------------------------------------------------------

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  cited_chunk_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create index chat_messages_user_id_created_at_idx on public.chat_messages (user_id, created_at);

-- updated_at triggers --------------------------------------------------------------------------

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger sources_set_updated_at before update on public.sources
  for each row execute function public.set_updated_at();
create trigger summaries_set_updated_at before update on public.summaries
  for each row execute function public.set_updated_at();
create trigger boards_set_updated_at before update on public.boards
  for each row execute function public.set_updated_at();
create trigger tasks_set_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

-- Privileges -----------------------------------------------------------------------------------
-- Signed-out visitors (anon) get nothing. Signed-in users get only what RLS policies also allow.

revoke all on public.profiles, public.usage, public.sources, public.transcripts, public.summaries,
  public.boards, public.tasks, public.chunks, public.chat_messages
  from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (display_name, default_mode) on public.profiles to authenticated;

grant select on public.usage, public.transcripts, public.chunks to authenticated;

grant select, insert, update, delete
  on public.sources, public.summaries, public.boards, public.tasks
  to authenticated;

grant select, insert, delete on public.chat_messages to authenticated;

-- Row Level Security ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.usage enable row level security;
alter table public.sources enable row level security;
alter table public.transcripts enable row level security;
alter table public.summaries enable row level security;
alter table public.boards enable row level security;
alter table public.tasks enable row level security;
alter table public.chunks enable row level security;
alter table public.chat_messages enable row level security;

-- Read-only for the owner.
create policy "Users read their own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users update their own profile" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Users read their own usage" on public.usage
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users read their own transcripts" on public.transcripts
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users read their own chunks" on public.chunks
  for select to authenticated using ((select auth.uid()) = user_id);

-- Full access to the owner's own rows.
create policy "Users manage their own sources" on public.sources
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users manage their own summaries" on public.summaries
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users manage their own boards" on public.boards
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users manage their own tasks" on public.tasks
  for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Users read their own chat messages" on public.chat_messages
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users add their own chat messages" on public.chat_messages
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users delete their own chat messages" on public.chat_messages
  for delete to authenticated using ((select auth.uid()) = user_id);

-- New user setup -------------------------------------------------------------------------------
-- Creates the profile and the default work board when an account is created (US-0.1).

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (
    new.id,
    left(nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name',
                              new.raw_user_meta_data ->> 'name')), ''), 100)
  );

  insert into public.boards (user_id, name, mode, is_default)
  values (new.id, 'Panom', 'work', true);

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
