-- Monthly AI request limits (T1.4, US-1.6). Free: 50, premium: 500 (DECISIONS.md).
-- A request is reserved before the AI runs, so parallel requests cannot pass the limit; it is
-- given back when the AI service could not be reached. Months follow Turkish time.

create function public.current_usage_period()
returns date
language sql
stable
set search_path = ''
as $$
  select date_trunc('month', now() at time zone 'Europe/Istanbul')::date;
$$;

create function public.ai_request_limit(p_plan text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_plan when 'premium' then 500 else 50 end;
$$;

comment on function public.ai_request_limit is
  'Monthly AI requests allowed on a plan. Keep in sync with DECISIONS.md.';

-- Counts one AI request if the user is under their limit. Returns false when the limit is reached.
create function public.reserve_ai_request(p_user_id uuid)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_limit integer;
begin
  select public.ai_request_limit(p.plan) into v_limit
    from public.profiles p
   where p.user_id = p_user_id;
  v_limit := coalesce(v_limit, public.ai_request_limit('free'));

  insert into public.usage as u (user_id, period, ai_requests)
  values (p_user_id, public.current_usage_period(), 1)
  on conflict (user_id, period) do update
    set ai_requests = u.ai_requests + 1
    where u.ai_requests < v_limit;

  return found;
end;
$$;

-- Gives back a reserved request when the AI never ran (for example, the service was unreachable).
create function public.release_ai_request(p_user_id uuid)
returns void
language sql
set search_path = ''
as $$
  update public.usage
     set ai_requests = ai_requests - 1
   where user_id = p_user_id
     and period = public.current_usage_period()
     and ai_requests > 0;
$$;

-- Requests are now counted by reserve_ai_request; this only adds tokens and cost.
create or replace function public.record_ai_usage(
  p_user_id uuid,
  p_tokens_in bigint,
  p_tokens_out bigint,
  p_cost_usd numeric
)
returns void
language sql
set search_path = ''
as $$
  insert into public.usage as u (user_id, period, tokens_in, tokens_out, cost_usd)
  values (p_user_id, public.current_usage_period(), p_tokens_in, p_tokens_out, p_cost_usd)
  on conflict (user_id, period) do update set
    tokens_in = u.tokens_in + excluded.tokens_in,
    tokens_out = u.tokens_out + excluded.tokens_out,
    cost_usd = u.cost_usd + excluded.cost_usd;
$$;

comment on function public.record_ai_usage is
  'Adds the tokens and cost of an AI request to the user''s usage for the current month. Server only.';

revoke execute on function public.reserve_ai_request(uuid), public.release_ai_request(uuid)
  from public, anon, authenticated;
grant execute on function public.reserve_ai_request(uuid), public.release_ai_request(uuid)
  to service_role;

-- The signed-in user's usage this month, for the settings page and the new note screen.
-- Runs with the caller's permissions, so it only ever reads their own rows.
create function public.get_my_ai_usage()
returns table (used integer, request_limit integer, plan text, period date)
language sql
stable
set search_path = ''
as $$
  select coalesce(u.ai_requests, 0),
         public.ai_request_limit(p.plan),
         p.plan,
         public.current_usage_period()
    from public.profiles p
    left join public.usage u
      on u.user_id = p.user_id and u.period = public.current_usage_period()
   where p.user_id = (select auth.uid());
$$;

revoke execute on function public.get_my_ai_usage() from public, anon;
grant execute on function public.get_my_ai_usage() to authenticated;
