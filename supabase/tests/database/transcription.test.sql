-- Transcribing audio notes (T2.3): minute limits, usage, and starting a transcription.
-- Uses synthetic users only.
begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

insert into auth.users (id, email)
values
  ('c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c1c1', 'stt-a@example.test'),
  ('c2c2c2c2-c2c2-4c2c-8c2c-c2c2c2c2c2c2', 'stt-b@example.test');

insert into public.sources (id, user_id, type, consent_confirmed_at, storage_path, status)
values
  ('d1d1d1d1-d1d1-4d1d-8d1d-d1d1d1d1d1d1', 'c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c1c1', 'audio', now(),
   'c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c1c1/d1d1d1d1-d1d1-4d1d-8d1d-d1d1d1d1d1d1.webm', 'pending'),
  ('d2d2d2d2-d2d2-4d2d-8d2d-d2d2d2d2d2d2', 'c2c2c2c2-c2c2-4c2c-8c2c-c2c2c2c2c2c2', 'audio', now(),
   'c2c2c2c2-c2c2-4c2c-8c2c-c2c2c2c2c2c2/d2d2d2d2-d2d2-4d2d-8d2d-d2d2d2d2d2d2.webm', 'pending'),
  ('d3d3d3d3-d3d3-4d3d-8d3d-d3d3d3d3d3d3', 'c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c1c1', 'audio', now(),
   'c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c1c1/d3d3d3d3-d3d3-4d3d-8d3d-d3d3d3d3d3d3.webm', 'processing');
insert into public.sources (id, user_id, type, raw_text)
values ('d4d4d4d4-d4d4-4d4d-8d4d-d4d4d4d4d4d4', 'c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c1c1', 'text', 'Metin notu');

-- Limits and usage (service role) ----------------------------------------------------------------

select is(public.stt_minute_limit('free'), 30, 'the free plan has 30 minutes a month');
select is(public.stt_minute_limit('premium'), 300, 'premium has 300 minutes a month');
select is(
  public.stt_minutes_remaining('c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c1c1'), 30::numeric,
  'a new user has the full limit'
);

select public.record_stt_usage('c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c1c1', 12.5, 0.05);
select is(
  public.stt_minutes_remaining('c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c1c1'), 17.5::numeric,
  'recorded minutes count against the limit'
);
select is(
  (select cost_usd from public.usage where user_id = 'c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c1c1'),
  0.05::numeric(12, 6),
  'the cost is added to the month''s usage'
);

select public.record_stt_usage('c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c1c1', 20, 0.09);
select is(
  public.stt_minutes_remaining('c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c1c1'), 0::numeric,
  'the remaining minutes never go below zero'
);

-- Starting a transcription (signed-in user) ------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub": "c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c1c1", "role": "authenticated"}';

select throws_ok(
  $$ select public.record_stt_usage('c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c1c1', -100, 0) $$,
  '42501', null,
  'users cannot write their own minutes'
);
select throws_ok(
  $$ select public.stt_minutes_remaining('c2c2c2c2-c2c2-4c2c-8c2c-c2c2c2c2c2c2') $$,
  '42501', null,
  'users cannot read other users'' minutes through the service function'
);

select is(public.start_transcription('d1d1d1d1-d1d1-4d1d-8d1d-d1d1d1d1d1d1'), true, 'a pending recording can start');
select is(
  (select status from public.sources where id = 'd1d1d1d1-d1d1-4d1d-8d1d-d1d1d1d1d1d1'), 'processing',
  'starting marks the note as processing'
);
select is(public.start_transcription('d1d1d1d1-d1d1-4d1d-8d1d-d1d1d1d1d1d1'), false, 'the same recording cannot start twice');
select is(public.start_transcription('d4d4d4d4-d4d4-4d4d-8d4d-d4d4d4d4d4d4'), false, 'a text note is not transcribed');
select is(public.start_transcription('d2d2d2d2-d2d2-4d2d-8d2d-d2d2d2d2d2d2'), false, 'another user''s recording cannot be started');

reset role;
-- The trigger sets updated_at on every update, so move it back without firing it.
alter table public.sources disable trigger sources_set_updated_at;
update public.sources set updated_at = now() - interval '11 minutes'
 where id = 'd3d3d3d3-d3d3-4d3d-8d3d-d3d3d3d3d3d3';
alter table public.sources enable trigger sources_set_updated_at;
set local role authenticated;

select is(public.start_transcription('d3d3d3d3-d3d3-4d3d-8d3d-d3d3d3d3d3d3'), true, 'a recording stuck in processing can start again');

select results_eq(
  $$ select used, stt_minutes, stt_minute_limit from public.get_my_ai_usage() $$,
  $$ values (0, 32.5::numeric, 30) $$,
  'the usage summary includes the month''s minutes and limit'
);

reset role;
insert into public.transcripts (user_id, source_id, text)
values ('c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c1c1', 'd1d1d1d1-d1d1-4d1d-8d1d-d1d1d1d1d1d1', 'İlk');
select throws_ok(
  $$ insert into public.transcripts (user_id, source_id, text)
     values ('c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c1c1', 'd1d1d1d1-d1d1-4d1d-8d1d-d1d1d1d1d1d1', 'İkinci') $$,
  '23505', null,
  'a note has at most one transcript'
);

select * from finish();
rollback;
