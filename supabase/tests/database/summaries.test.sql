-- Saving AI results (T1.5). Uses synthetic users only.
begin;

create extension if not exists pgtap with schema extensions;

select plan(6);

insert into auth.users (id, email)
values
  ('55555555-5555-4555-8555-555555555555', 'summary-a@example.test'),
  ('66666666-6666-4666-8666-666666666666', 'summary-b@example.test');

insert into public.sources (id, user_id, type, raw_text)
values
  ('cccccccc-0000-4000-8000-000000000001', '55555555-5555-4555-8555-555555555555', 'text', 'A notu'),
  ('cccccccc-0000-4000-8000-000000000002', '66666666-6666-4666-8666-666666666666', 'text', 'B notu');

set local role authenticated;
set local request.jwt.claims = '{"sub": "55555555-5555-4555-8555-555555555555", "role": "authenticated"}';

select lives_ok(
  $$ insert into public.summaries (source_id, summary, proposed_tasks)
     values ('cccccccc-0000-4000-8000-000000000001', 'İlk özet',
             '[{"title": "Raporu hazırla", "type": "task", "assignee": null, "due_date": null}]') $$,
  'a user saves a summary with proposed tasks for their note'
);

select lives_ok(
  $$ insert into public.summaries (source_id, summary, proposed_tasks)
     values ('cccccccc-0000-4000-8000-000000000001', 'Yeni özet', '[]')
     on conflict (source_id) do update
       set summary = excluded.summary, proposed_tasks = excluded.proposed_tasks $$,
  'processing the note again replaces its summary'
);

select results_eq(
  $$ select count(*)::int, min(summary), min(jsonb_array_length(proposed_tasks))
       from public.summaries where source_id = 'cccccccc-0000-4000-8000-000000000001' $$,
  $$ values (1, 'Yeni özet'::text, 0) $$,
  'a note keeps exactly one summary'
);

select throws_ok(
  $$ insert into public.summaries (source_id, summary)
     values ('cccccccc-0000-4000-8000-000000000001', 'İkinci özet') $$,
  '23505', null,
  'a second summary for the same note is rejected'
);

select throws_ok(
  $$ update public.summaries set proposed_tasks = '{"title": "x"}'
      where source_id = 'cccccccc-0000-4000-8000-000000000001' $$,
  '23514', null,
  'proposed tasks must be a list'
);

select throws_ok(
  $$ insert into public.summaries (source_id, summary)
     values ('cccccccc-0000-4000-8000-000000000002', 'Sızma') $$,
  '23503', null,
  'a user cannot save a summary for another user''s note'
);

select * from finish();
rollback;
