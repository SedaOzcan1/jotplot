-- Row Level Security and new-user setup tests for the initial schema (T0.4).
-- Run with `npm run test:db` while local Supabase is running. Uses synthetic users only.
begin;

create extension if not exists pgtap with schema extensions;

select plan(27);

-- Every user-owned table has RLS enabled ------------------------------------------------------

select ok(
  (select bool_and(c.relrowsecurity)
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'),
  'RLS is enabled on every table in the public schema'
);

select is(
  (select count(*)::int
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'),
  9,
  'public schema has the 9 MVP tables'
);

-- Two synthetic users; the auth trigger creates their profile and default board ---------------

insert into auth.users (id, email, raw_user_meta_data)
values
  ('11111111-1111-4111-8111-111111111111', 'user-a@example.test', '{"full_name": "Kullanıcı A"}'),
  ('22222222-2222-4222-8222-222222222222', 'user-b@example.test', '{}');

select is(
  (select display_name from public.profiles
    where user_id = '11111111-1111-4111-8111-111111111111'),
  'Kullanıcı A',
  'new user gets a profile with the display name from sign-up metadata'
);

select results_eq(
  $$ select name, mode, is_default, jsonb_array_length(columns) from public.boards
      where user_id = '22222222-2222-4222-8222-222222222222' $$,
  $$ values ('Panom'::text, 'work'::text, true, 3) $$,
  'new user gets one default work board with three columns'
);

select is(
  (select plan from public.profiles where user_id = '22222222-2222-4222-8222-222222222222'),
  'free',
  'new users start on the free plan'
);

-- Data owned by user B, created as the server
insert into public.sources (id, user_id, type, title, raw_text)
values ('bbbbbbbb-0000-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222',
        'text', 'B notu', 'Gizli toplantı notu');
insert into public.boards (id, user_id, name)
values ('bbbbbbbb-0000-4000-8000-0000000000b1', '22222222-2222-4222-8222-222222222222', 'B ikinci pano');
insert into public.usage (user_id, period, ai_requests)
values ('22222222-2222-4222-8222-222222222222', '2026-11-01', 3);
insert into public.transcripts (user_id, source_id, text)
values ('22222222-2222-4222-8222-222222222222', 'bbbbbbbb-0000-4000-8000-000000000001', 'B dökümü');
insert into public.chat_messages (user_id, role, content)
values ('22222222-2222-4222-8222-222222222222', 'user', 'B sorusu');

-- Signed-out visitors (anon) --------------------------------------------------------------------

set local role anon;

select throws_ok(
  $$ select * from public.sources $$,
  '42501', null,
  'anon cannot read sources'
);
select throws_ok(
  $$ select * from public.profiles $$,
  '42501', null,
  'anon cannot read profiles'
);

reset role;

-- Signed in as user A ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub": "11111111-1111-4111-8111-111111111111", "role": "authenticated"}';

select is((select count(*)::int from public.profiles), 1, 'A sees only their own profile');
select is((select count(*)::int from public.boards), 1, 'A sees only their own board, not B''s two');
select is((select count(*)::int from public.sources), 0, 'A cannot see B''s notes');
select is((select count(*)::int from public.usage), 0, 'A cannot see B''s usage');
select is((select count(*)::int from public.transcripts), 0, 'A cannot see B''s transcripts');
select is((select count(*)::int from public.chat_messages), 0, 'A cannot see B''s chat messages');

-- A can create and edit their own content
select lives_ok(
  $$ insert into public.sources (id, type, title, raw_text)
     values ('aaaaaaaa-0000-4000-8000-000000000001', 'text', 'A notu', 'Toplantı notu') $$,
  'A can create a note; user_id defaults to A'
);
select is(
  (select user_id from public.sources where id = 'aaaaaaaa-0000-4000-8000-000000000001'),
  '11111111-1111-4111-8111-111111111111'::uuid,
  'the new note belongs to A'
);
select lives_ok(
  $$ insert into public.tasks (board_id, source_id, title)
     select id, 'aaaaaaaa-0000-4000-8000-000000000001', 'Raporu hazırla'
       from public.boards where is_default $$,
  'A can add a task from their note to their default board'
);
select lives_ok(
  $$ update public.profiles set display_name = 'Yeni ad', default_mode = 'student' $$,
  'A can change their display name and default mode'
);

-- A cannot write as B or into B's data
select throws_ok(
  $$ insert into public.sources (user_id, type, raw_text)
     values ('22222222-2222-4222-8222-222222222222', 'text', 'sahte') $$,
  '42501', null,
  'A cannot create a note owned by B'
);
select throws_ok(
  $$ insert into public.tasks (board_id, title)
     values ('bbbbbbbb-0000-4000-8000-0000000000b1', 'Sızma denemesi') $$,
  '23503', null,
  'A cannot add a task to B''s board even with its id'
);
select throws_ok(
  $$ insert into public.summaries (source_id, summary)
     values ('bbbbbbbb-0000-4000-8000-000000000001', 'B notuna özet') $$,
  '23503', null,
  'A cannot attach a summary to B''s note even with its id'
);

-- Server-only columns and tables
select throws_ok(
  $$ update public.profiles set plan = 'premium' $$,
  '42501', null,
  'A cannot upgrade their own plan'
);
select throws_ok(
  $$ insert into public.usage (period, ai_requests) values ('2026-11-01', 0) $$,
  '42501', null,
  'A cannot write usage rows'
);
select throws_ok(
  $$ insert into public.transcripts (source_id, text)
     values ('aaaaaaaa-0000-4000-8000-000000000001', 'sahte döküm') $$,
  '42501', null,
  'A cannot write transcripts'
);

-- Updates and deletes on B's rows silently match nothing
update public.sources set title = 'ele geçirildi' where id = 'bbbbbbbb-0000-4000-8000-000000000001';
delete from public.chat_messages;

reset role;

select is(
  (select title from public.sources where id = 'bbbbbbbb-0000-4000-8000-000000000001'),
  'B notu',
  'A''s update did not change B''s note'
);
select is(
  (select count(*)::int from public.chat_messages
    where user_id = '22222222-2222-4222-8222-222222222222'),
  1,
  'A''s delete did not remove B''s chat messages'
);

-- Cascades ------------------------------------------------------------------------------------

delete from public.sources where id = 'aaaaaaaa-0000-4000-8000-000000000001';
select results_eq(
  $$ select title, source_id from public.tasks
      where user_id = '11111111-1111-4111-8111-111111111111' $$,
  $$ values ('Raporu hazırla'::text, null::uuid) $$,
  'deleting a note keeps its tasks and clears the link'
);

delete from auth.users where id = '22222222-2222-4222-8222-222222222222';
select is(
  (select count(*)::int from public.sources where user_id = '22222222-2222-4222-8222-222222222222')
  + (select count(*)::int from public.profiles where user_id = '22222222-2222-4222-8222-222222222222')
  + (select count(*)::int from public.boards where user_id = '22222222-2222-4222-8222-222222222222')
  + (select count(*)::int from public.usage where user_id = '22222222-2222-4222-8222-222222222222'),
  0,
  'deleting an account removes all of its data'
);

select * from finish();
rollback;
