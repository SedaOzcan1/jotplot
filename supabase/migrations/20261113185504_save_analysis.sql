-- Saving AI results (T1.5, US-1.2, US-1.3).
-- Each note has at most one summary; processing a note again replaces it. Extracted tasks are kept
-- on the summary as proposals and become rows in `tasks` only after the user approves them
-- ("Panoya ekle", T1.6).

alter table public.summaries
  add column proposed_tasks jsonb not null default '[]'::jsonb
    check (jsonb_typeof(proposed_tasks) = 'array'),
  add constraint summaries_one_per_source unique (source_id);

comment on column public.summaries.proposed_tasks is
  'Tasks extracted by the AI, waiting for the user to review them: '
  '[{title, type, assignee, due_date}]. Cleared once they are added to a board.';

-- The unique constraint above also serves lookups by source_id.
drop index public.summaries_source_id_idx;
