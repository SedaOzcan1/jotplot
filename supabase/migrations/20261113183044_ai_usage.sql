-- AI usage accounting (T1.2). Edge Functions call this with the service role after each AI request;
-- signed-in users can read their usage rows but never write them.

create function public.record_ai_usage(
  p_user_id uuid,
  p_tokens_in bigint,
  p_tokens_out bigint,
  p_cost_usd numeric
)
returns void
language sql
set search_path = ''
as $$
  insert into public.usage (user_id, period, ai_requests, tokens_in, tokens_out, cost_usd)
  values (
    p_user_id,
    -- Months follow Turkish time, the product's main market.
    date_trunc('month', now() at time zone 'Europe/Istanbul')::date,
    1,
    p_tokens_in,
    p_tokens_out,
    p_cost_usd
  )
  on conflict (user_id, period) do update set
    ai_requests = public.usage.ai_requests + 1,
    tokens_in = public.usage.tokens_in + excluded.tokens_in,
    tokens_out = public.usage.tokens_out + excluded.tokens_out,
    cost_usd = public.usage.cost_usd + excluded.cost_usd;
$$;

comment on function public.record_ai_usage is
  'Adds one AI request and its tokens and cost to the user''s usage for the current month. Server only.';

revoke execute on function public.record_ai_usage(uuid, bigint, bigint, numeric)
  from public, anon, authenticated;
grant execute on function public.record_ai_usage(uuid, bigint, bigint, numeric) to service_role;
