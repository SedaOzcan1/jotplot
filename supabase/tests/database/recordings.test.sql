-- Audio notes and the recordings bucket (T2.2, US-2.1). Uses synthetic users only.
begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

insert into auth.users (id, email)
values
  ('a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1', 'recordings-a@example.test'),
  ('b2b2b2b2-b2b2-4b2b-8b2b-b2b2b2b2b2b2', 'recordings-b@example.test');

select is(
  (select public from storage.buckets where id = 'recordings'),
  false,
  'the recordings bucket is private'
);
select is(
  (select file_size_limit from storage.buckets where id = 'recordings'),
  26214400::bigint,
  'recordings are at most 25 MB'
);

-- User B already has a recording.
insert into storage.objects (bucket_id, name, owner_id)
values ('recordings', 'b2b2b2b2-b2b2-4b2b-8b2b-b2b2b2b2b2b2/c3c3c3c3-c3c3-4c3c-8c3c-c3c3c3c3c3c3.webm', 'b2b2b2b2-b2b2-4b2b-8b2b-b2b2b2b2b2b2');

set local role authenticated;
set local request.jwt.claims = '{"sub": "a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1", "role": "authenticated"}';

-- Notes -------------------------------------------------------------------------------------------

select throws_ok(
  $$ insert into public.sources (id, type, storage_path)
     values ('d4d4d4d4-d4d4-4d4d-8d4d-d4d4d4d4d4d4', 'audio',
             'a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1/d4d4d4d4-d4d4-4d4d-8d4d-d4d4d4d4d4d4.webm') $$,
  '23514', null,
  'an audio note needs the consent confirmation'
);
select throws_ok(
  $$ insert into public.sources (type, consent_confirmed_at) values ('audio', now()) $$,
  '23514', null,
  'an audio note needs a file'
);
select throws_ok(
  $$ insert into public.sources (id, type, consent_confirmed_at, storage_path)
     values ('d4d4d4d4-d4d4-4d4d-8d4d-d4d4d4d4d4d4', 'audio', now(),
             'b2b2b2b2-b2b2-4b2b-8b2b-b2b2b2b2b2b2/c3c3c3c3-c3c3-4c3c-8c3c-c3c3c3c3c3c3.webm') $$,
  '23514', null,
  'an audio note cannot point to another user''s file'
);
select throws_ok(
  $$ insert into public.sources (id, type, consent_confirmed_at, storage_path)
     values ('d4d4d4d4-d4d4-4d4d-8d4d-d4d4d4d4d4d4', 'audio', now(),
             'a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1/d4d4d4d4-d4d4-4d4d-8d4d-d4d4d4d4d4d4.exe') $$,
  '23514', null,
  'an audio note needs an audio file extension'
);
select lives_ok(
  $$ insert into public.sources (id, type, consent_confirmed_at, storage_path)
     values ('d4d4d4d4-d4d4-4d4d-8d4d-d4d4d4d4d4d4', 'audio', now(),
             'a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1/d4d4d4d4-d4d4-4d4d-8d4d-d4d4d4d4d4d4.webm') $$,
  'an audio note with consent and its own file is accepted'
);

-- Storage ---------------------------------------------------------------------------------------

select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('recordings', 'a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1/d4d4d4d4-d4d4-4d4d-8d4d-d4d4d4d4d4d4.webm',
             'a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1') $$,
  'a user can upload to their own folder'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('recordings', 'b2b2b2b2-b2b2-4b2b-8b2b-b2b2b2b2b2b2/e5e5e5e5-e5e5-4e5e-8e5e-e5e5e5e5e5e5.webm',
             'a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1') $$,
  '42501', null,
  'a user cannot upload to another user''s folder'
);
select is(
  (select count(*)::int from storage.objects where bucket_id = 'recordings'),
  1,
  'a user sees only their own recordings'
);

update storage.objects set name = name || '.copy' where bucket_id = 'recordings';
-- The Storage API turns this on for its own deletes; the policies still decide what is deleted.
set local storage.allow_delete_query = 'true';
delete from storage.objects
  where name = 'b2b2b2b2-b2b2-4b2b-8b2b-b2b2b2b2b2b2/c3c3c3c3-c3c3-4c3c-8c3c-c3c3c3c3c3c3.webm';

reset role;

select is(
  (select count(*)::int from storage.objects
    where name = 'a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1/d4d4d4d4-d4d4-4d4d-8d4d-d4d4d4d4d4d4.webm'),
  1,
  'a recording cannot be renamed or overwritten'
);
select is(
  (select count(*)::int from storage.objects
    where name = 'b2b2b2b2-b2b2-4b2b-8b2b-b2b2b2b2b2b2/c3c3c3c3-c3c3-4c3c-8c3c-c3c3c3c3c3c3.webm'),
  1,
  'a user cannot delete another user''s recording'
);

select * from finish();
rollback;
