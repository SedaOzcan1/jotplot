-- Approving AI results (T1.6, US-1.3). Uses synthetic users only.
begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

insert into auth.users (id, email)
values
  ('77777777-7777-4777-8777-777777777777', 'approve-a@example.test'),
  ('88888888-8888-4888-8888-888888888888', 'approve-b@example.test');

insert into public.sources (id, user_id, type, raw_text, mode)
values
  ('dddddddd-0000-4000-8000-000000000001', '77777777-7777-4777-8777-777777777777', 'text', 'A notu', 'work'),
  ('dddddddd-0000-4000-8000-000000000002', '88888888-8888-4888-8888-888888888888', 'text', 'B notu', 'work');

insert into public.summaries (id, user_id, source_id, summary, proposed_tasks)
values
  ('eeeeeeee-0000-4000-8000-000000000001', '77777777-7777-4777-8777-777777777777',
   'dddddddd-0000-4000-8000-000000000001', 'AI özeti',
   '[{"title": "AI görevi", "type": "task", "assignee": null, "due_date": null}]'),
  ('eeeeeeee-0000-4000-8000-000000000002', '88888888-8888-4888-8888-888888888888',
   'dddddddd-0000-4000-8000-000000000002', 'B özeti', '[]');

-- A card already in A's "Yapılacak" column.
insert into public.tasks (user_id, board_id, title, position)
select '77777777-7777-4777-8777-777777777777', id, 'Eski görev', 5
  from public.boards where user_id = '77777777-7777-4777-8777-777777777777' and is_default;

set local role authenticated;
set local request.jwt.claims = '{"sub": "77777777-7777-4777-8777-777777777777", "role": "authenticated"}';

select is(
  public.approve_summary(
    'eeeeeeee-0000-4000-8000-000000000001',
    'Düzenlenmiş özet',
    '["Lansman ertelendi"]', '[]', '["Ajans kim?"]',
    '[{"title": " Görselleri hazırla ", "type": "task", "assignee": "Elif", "due_date": "2026-11-20"},
      {"title": "Bütçeyi güncelle", "type": "task", "assignee": " ", "due_date": null}]'
  ),
  2,
  'approving adds the reviewed tasks and returns how many'
);

select results_eq(
  $$ select t.title, t.assignee, t.due_date, t.status, t.position, t.source_id
       from public.tasks t join public.boards b on b.id = t.board_id
      where b.is_default and t.source_id is not null
      order by t.position $$,
  $$ values
       ('Görselleri hazırla'::text, 'Elif'::text, '2026-11-20'::date, 'todo'::text, 6::double precision,
        'dddddddd-0000-4000-8000-000000000001'::uuid),
       ('Bütçeyi güncelle', null, null, 'todo', 7, 'dddddddd-0000-4000-8000-000000000001') $$,
  'tasks land in the default board''s Yapılacak column below existing cards, linked to the note'
);

select results_eq(
  $$ select summary, decisions, questions, proposed_tasks from public.summaries
      where id = 'eeeeeeee-0000-4000-8000-000000000001' $$,
  $$ values ('Düzenlenmiş özet'::text, '["Lansman ertelendi"]'::jsonb, '["Ajans kim?"]'::jsonb, '[]'::jsonb) $$,
  'the user''s edits are saved and the proposals are cleared'
);

select is(
  public.approve_summary('eeeeeeee-0000-4000-8000-000000000001', 'Özet', '[]', '[]', '[]', '[]'),
  0,
  'approving with no tasks only saves the summary'
);

select throws_ok(
  $$ select public.approve_summary('eeeeeeee-0000-4000-8000-000000000001', 'Özet', '[]', '[]', '[]',
       '[{"title": "  ", "type": "task", "assignee": null, "due_date": null}]') $$,
  '23514', null,
  'a task without a title is rejected'
);

select throws_ok(
  $$ select public.approve_summary('eeeeeeee-0000-4000-8000-000000000001', 'Özet', '[]', '[]', '[]',
       '{"title": "x"}') $$,
  '22023', null,
  'tasks must be a list'
);

select throws_ok(
  $$ select public.approve_summary('eeeeeeee-0000-4000-8000-000000000002', 'Sızma', '[]', '[]', '[]',
       '[{"title": "Sızma", "type": "task", "assignee": null, "due_date": null}]') $$,
  'P0002', null,
  'a user cannot approve another user''s summary'
);

reset role;

select is(
  (select count(*)::int from public.tasks where user_id = '88888888-8888-4888-8888-888888888888'),
  0,
  'the other user''s board is untouched'
);

set local role anon;
select throws_ok(
  $$ select public.approve_summary('eeeeeeee-0000-4000-8000-000000000001', 'x', '[]', '[]', '[]', '[]') $$,
  '42501', null,
  'signed-out visitors cannot approve summaries'
);

select * from finish();
rollback;
