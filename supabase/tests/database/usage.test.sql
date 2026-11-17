-- AI usage accounting and monthly limits (T1.2, T1.4). Uses synthetic users only.
begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

insert into auth.users (id, email)
values
  ('44444444-4444-4444-8444-444444444444', 'usage@example.test'),
  ('45454545-4545-4545-8545-454545454545', 'usage-premium@example.test');

update public.profiles set plan = 'premium'
 where user_id = '45454545-4545-4545-8545-454545454545';

-- Limits ------------------------------------------------------------------------------------

select is(public.ai_request_limit('free'), 50, 'the free plan allows 50 AI requests a month');
select is(public.ai_request_limit('premium'), 500, 'the premium plan allows 500 AI requests a month');

-- Only the server can count requests ---------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub": "44444444-4444-4444-8444-444444444444", "role": "authenticated"}';

select throws_ok(
  $$ select public.reserve_ai_request('44444444-4444-4444-8444-444444444444') $$,
  '42501', null,
  'signed-in users cannot count requests themselves'
);
select throws_ok(
  $$ select public.release_ai_request('44444444-4444-4444-8444-444444444444') $$,
  '42501', null,
  'signed-in users cannot give requests back to themselves'
);
select throws_ok(
  $$ select public.record_ai_usage('44444444-4444-4444-8444-444444444444', 1, 1, 0) $$,
  '42501', null,
  'signed-in users cannot record AI usage'
);
select results_eq(
  $$ select used, request_limit, plan from public.get_my_ai_usage() $$,
  $$ values (0, 50, 'free'::text) $$,
  'a new user has used none of their 50 requests'
);

reset role;
set local role anon;

select throws_ok(
  $$ select public.reserve_ai_request('44444444-4444-4444-8444-444444444444') $$,
  '42501', null,
  'signed-out visitors cannot count requests'
);
select throws_ok(
  $$ select * from public.get_my_ai_usage() $$,
  '42501', null,
  'signed-out visitors cannot read usage'
);

-- Counting, tokens, and giving back ----------------------------------------------------------

reset role;
set local role service_role;

select ok(
  public.reserve_ai_request('44444444-4444-4444-8444-444444444444'),
  'the server counts the first request of the month'
);
select lives_ok(
  $$ select public.record_ai_usage('44444444-4444-4444-8444-444444444444', 2000, 1000, 0.0007) $$,
  'the server records its tokens and cost'
);
select lives_ok(
  $$ select public.reserve_ai_request('44444444-4444-4444-8444-444444444444');
     select public.release_ai_request('44444444-4444-4444-8444-444444444444') $$,
  'a request is given back when the AI could not be reached'
);

reset role;

select results_eq(
  $$ select ai_requests, tokens_in, tokens_out, cost_usd from public.usage
      where user_id = '44444444-4444-4444-8444-444444444444' $$,
  $$ values (1, 2000::bigint, 1000::bigint, 0.0007::numeric(12, 6)) $$,
  'one request with its tokens and cost is counted for the month'
);

-- The limit ----------------------------------------------------------------------------------

update public.usage set ai_requests = 49
 where user_id = '44444444-4444-4444-8444-444444444444';

set local role service_role;
select ok(
  public.reserve_ai_request('44444444-4444-4444-8444-444444444444'),
  'the 50th request of the month is allowed'
);
select ok(
  not public.reserve_ai_request('44444444-4444-4444-8444-444444444444'),
  'the 51st request is refused'
);
reset role;

select is(
  (select ai_requests from public.usage where user_id = '44444444-4444-4444-8444-444444444444'),
  50,
  'a refused request is not counted'
);

insert into public.usage (user_id, period, ai_requests)
values ('45454545-4545-4545-8545-454545454545', public.current_usage_period(), 50);

set local role service_role;
select ok(
  public.reserve_ai_request('45454545-4545-4545-8545-454545454545'),
  'premium users can go past 50 requests'
);
reset role;

select * from finish();
rollback;
