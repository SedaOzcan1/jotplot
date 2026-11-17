-- Searching and filtering notes (T1.8). Uses synthetic users only.
begin;

create extension if not exists pgtap with schema extensions;

select plan(10);

insert into auth.users (id, email)
values
  ('99999999-9999-4999-8999-999999999999', 'search-a@example.test'),
  ('98989898-9898-4898-8898-989898989898', 'search-b@example.test');

insert into public.sources (user_id, type, mode, title, raw_text)
values
  ('99999999-9999-4999-8999-999999999999', 'text', 'work', 'İstanbul ofisi', 'Taşınma planı'),
  ('99999999-9999-4999-8999-999999999999', 'text', 'work', null, 'Bütçe %20 artırıldı; IŞIK projesi'),
  ('99999999-9999-4999-8999-999999999999', 'audio', 'work', 'Ses kaydı', null),
  ('99999999-9999-4999-8999-999999999999', 'text', 'student', 'Ders notu', 'Türev konusu'),
  ('98989898-9898-4898-8898-989898989898', 'text', 'work', 'B İstanbul notu', 'Gizli');

set local role authenticated;
set local request.jwt.claims = '{"sub": "99999999-9999-4999-8999-999999999999", "role": "authenticated"}';

select is((select count(*)::int from public.search_notes()), 4, 'no filters return all of the user''s notes');
select is((select count(*)::int from public.search_notes('  ')), 4, 'a blank search does not filter');

select results_eq(
  $$ select title from public.search_notes('istanbul') $$,
  $$ values ('İstanbul ofisi'::text) $$,
  'search matches the title, ignoring Turkish case, and never another user''s notes'
);
select is(
  (select count(*)::int from public.search_notes('ISTANBUL')), 1,
  'capital I matches dotted İ'
);
select is(
  (select count(*)::int from public.search_notes('ışık')), 1,
  'search matches the note text, with dotless ı matching I'
);
select is(
  (select count(*)::int from public.search_notes('%20')), 1,
  'percent signs are searched literally'
);
select is(
  (select count(*)::int from public.search_notes('%')), 1,
  'a lone percent sign does not match every note'
);
select is((select count(*)::int from public.search_notes(null, 'audio')), 1, 'notes can be filtered by type');
select is((select count(*)::int from public.search_notes(null, null, 'student')), 1, 'notes can be filtered by mode');

reset role;
set local role anon;
select throws_ok(
  $$ select * from public.search_notes() $$,
  '42501', null,
  'signed-out visitors cannot search notes'
);

select * from finish();
rollback;
