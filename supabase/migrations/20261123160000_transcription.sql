-- Transcribing audio notes (T2.3, US-2.2). The transcribe-audio Edge Function writes transcripts
-- and minutes with the service role; users only read them. Monthly speech-to-text limits:
-- 30 minutes on the free plan and 300 on premium (DECISIONS.md). Months follow Turkish time.

-- One transcript per note, so a retry replaces it.
alter table public.transcripts add constraint transcripts_source_id_key unique (source_id);

create function public.stt_minute_limit(p_plan text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_plan when 'premium' then 300 else 30 end;
$$;

comment on function public.stt_minute_limit is
  'Monthly speech-to-text minutes allowed on a plan. Keep in sync with DECISIONS.md.';

-- Minutes the user can still transcribe this month. A recording is accepted while this is above
-- zero, so one recording may go past the limit; its real length is only known afterwards.
create function public.stt_minutes_remaining(p_user_id uuid)
returns numeric
language sql
stable
set search_path = ''
as $$
  select greatest(
    public.stt_minute_limit(coalesce(p.plan, 'free')) - coalesce(u.stt_minutes, 0),
    0
  )
    from (select p_user_id as user_id) me
    left join public.profiles p on p.user_id = me.user_id
    left join public.usage u
      on u.user_id = me.user_id and u.period = public.current_usage_period();
$$;

-- Adds the minutes and cost of a finished transcription to the user's usage this month.
create function public.record_stt_usage(p_user_id uuid, p_minutes numeric, p_cost_usd numeric)
returns void
language sql
set search_path = ''
as $$
  insert into public.usage as u (user_id, period, stt_minutes, cost_usd)
  values (p_user_id, public.current_usage_period(), p_minutes, p_cost_usd)
  on conflict (user_id, period) do update set
    stt_minutes = u.stt_minutes + excluded.stt_minutes,
    cost_usd = u.cost_usd + excluded.cost_usd;
$$;

revoke execute on function public.stt_minutes_remaining(uuid), public.record_stt_usage(uuid, numeric, numeric)
  from public, anon, authenticated;
grant execute on function public.stt_minutes_remaining(uuid), public.record_stt_usage(uuid, numeric, numeric)
  to service_role;

-- Marks an audio note as being transcribed. Returns false when it is already being transcribed
-- or done, so two requests never transcribe the same note. A note stuck in "processing" for more
-- than 10 minutes (the function was stopped) can be started again.
-- Runs with the caller's permissions, so users can only start their own notes.
create function public.start_transcription(p_source_id uuid)
returns boolean
language sql
set search_path = ''
as $$
  with started as (
    update public.sources
       set status = 'processing'
     where id = p_source_id
       and type = 'audio'
       and (
         status in ('pending', 'failed')
         or (status = 'processing' and updated_at < now() - interval '10 minutes')
       )
    returning 1
  )
  select exists (select 1 from started);
$$;

revoke execute on function public.start_transcription(uuid) from public, anon;
grant execute on function public.start_transcription(uuid) to authenticated;

-- The usage summary now includes speech-to-text minutes. The return type changes, so the
-- function is replaced.
drop function public.get_my_ai_usage();

create function public.get_my_ai_usage()
returns table (
  used integer,
  request_limit integer,
  plan text,
  period date,
  stt_minutes numeric,
  stt_minute_limit integer
)
language sql
stable
set search_path = ''
as $$
  select coalesce(u.ai_requests, 0),
         public.ai_request_limit(p.plan),
         p.plan,
         public.current_usage_period(),
         coalesce(u.stt_minutes, 0),
         public.stt_minute_limit(p.plan)
    from public.profiles p
    left join public.usage u
      on u.user_id = p.user_id and u.period = public.current_usage_period()
   where p.user_id = (select auth.uid());
$$;

revoke execute on function public.get_my_ai_usage() from public, anon;
grant execute on function public.get_my_ai_usage() to authenticated;
