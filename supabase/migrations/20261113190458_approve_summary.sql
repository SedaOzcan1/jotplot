-- Approving AI results (T1.6, US-1.3): saves the user's edits to a summary and adds the reviewed
-- tasks to the default board's "Yapılacak" column in one transaction, then clears the proposals.
-- Runs with the caller's permissions, so Row Level Security still limits it to their own rows.

create function public.approve_summary(
  p_summary_id uuid,
  p_summary text,
  p_decisions jsonb,
  p_concepts jsonb,
  p_questions jsonb,
  p_tasks jsonb
)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_source_id uuid;
  v_mode text;
  v_board_id uuid;
  v_start double precision;
  v_added integer;
begin
  if jsonb_typeof(p_tasks) is distinct from 'array' then
    raise exception 'p_tasks must be a JSON array' using errcode = '22023';
  end if;

  select s.source_id, src.mode
    into v_source_id, v_mode
    from public.summaries s
    join public.sources src on src.id = s.source_id
   where s.id = p_summary_id;
  if not found then
    raise exception 'summary not found' using errcode = 'P0002';
  end if;

  select b.id into v_board_id
    from public.boards b
   where b.is_default and b.mode = v_mode;
  if v_board_id is null then
    -- Every user gets a default work board at sign-up; other modes get theirs on first use.
    insert into public.boards (name, mode, is_default)
    values ('Panom', v_mode, true)
    returning id into v_board_id;
  end if;

  update public.summaries
     set summary = p_summary,
         decisions = p_decisions,
         concepts = p_concepts,
         questions = p_questions,
         proposed_tasks = '[]'::jsonb
   where id = p_summary_id;

  -- New tasks go below the cards already in the column, in the order the user reviewed them.
  select coalesce(max(t.position), 0) into v_start
    from public.tasks t
   where t.board_id = v_board_id and t.status = 'todo';

  insert into public.tasks (board_id, source_id, title, type, assignee, due_date, status, position)
  select v_board_id, v_source_id, btrim(t.title), coalesce(t.type, 'task'),
         nullif(btrim(t.assignee), ''), t.due_date, 'todo', v_start + t.ordinality
    from rows from (
           jsonb_to_recordset(p_tasks) as (title text, type text, assignee text, due_date date)
         ) with ordinality as t(title, type, assignee, due_date, ordinality);
  get diagnostics v_added = row_count;

  return v_added;
end;
$$;

comment on function public.approve_summary is
  'Saves edits to a summary and adds the reviewed tasks to the default board (US-1.3).';

revoke execute on function public.approve_summary(uuid, text, jsonb, jsonb, jsonb, jsonb)
  from public, anon;
grant execute on function public.approve_summary(uuid, text, jsonb, jsonb, jsonb, jsonb)
  to authenticated;
