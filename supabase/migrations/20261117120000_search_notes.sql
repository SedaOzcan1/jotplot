-- Searching and filtering notes (T1.8, US-1.5).

-- Lowercases text for search so Turkish dotted and dotless i match each other: "İstanbul",
-- "ISTANBUL", and "ıstanbul" all match "istanbul". Postgres would otherwise turn "İ" into
-- "i" plus a combining dot.
create function public.search_normalize(p_text text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select lower(translate(p_text, 'İIı', 'iii'));
$$;

-- The signed-in user's notes matching a search text (in the title or the note), a type, and a
-- mode. Empty arguments do not filter. Runs with the caller's permissions, so Row Level Security
-- limits it to their own notes. Ordering and paging are applied by the caller.
create function public.search_notes(
  p_query text default null,
  p_type text default null,
  p_mode text default null
)
returns setof public.sources
language sql
stable
set search_path = ''
as $$
  select s.*
    from public.sources s
   where (p_type is null or s.type = p_type)
     and (p_mode is null or s.mode = p_mode)
     and (
       coalesce(btrim(p_query), '') = ''
       or public.search_normalize(coalesce(s.title, '') || ' ' || coalesce(s.raw_text, ''))
          like '%' || replace(replace(replace(public.search_normalize(btrim(p_query)),
                         '\', '\\'), '%', '\%'), '_', '\_') || '%'
          escape '\'
     );
$$;

comment on function public.search_notes is
  'Notes of the signed-in user filtered by search text, type, and mode (US-1.5).';

revoke execute on function public.search_notes(text, text, text) from public, anon;
grant execute on function public.search_notes(text, text, text) to authenticated;
