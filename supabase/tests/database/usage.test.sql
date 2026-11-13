-- AI usage accounting (T1.2). Uses a synthetic user only.
begin;

create extension if not exists pgtap with schema extensions;

select plan(5);

insert into auth.users (id, email)
values ('44444444-4444-4444-8444-444444444444', 'usage@example.test');

-- Signed-in users cannot add usage for themselves (that would let them reset or fake limits).
set local role authenticated;
set local request.jwt.claims = '{"sub": "44444444-4444-4444-8444-444444444444", "role": "authenticated"}';

select throws_ok(
  $$ select public.record_ai_usage('44444444-4444-4444-8444-444444444444', 1, 1, 0) $$,
  '42501', null,
  'signed-in users cannot record AI usage'
);

reset role;
set local role anon;

select throws_ok(
  $$ select public.record_ai_usage('44444444-4444-4444-8444-444444444444', 1, 1, 0) $$,
  '42501', null,
  'signed-out visitors cannot record AI usage'
);

reset role;
set local role service_role;

select lives_ok(
  $$ select public.record_ai_usage('44444444-4444-4444-8444-444444444444', 2000, 1000, 0.0007) $$,
  'the server records the first AI request of the month'
);
select lives_ok(
  $$ select public.record_ai_usage('44444444-4444-4444-8444-444444444444', 500, 250, 0.000175) $$,
  'the server records a second AI request'
);

reset role;

select results_eq(
  $$ select ai_requests, tokens_in, tokens_out, cost_usd from public.usage
      where user_id = '44444444-4444-4444-8444-444444444444' $$,
  $$ values (2, 2500::bigint, 1250::bigint, 0.000875::numeric(12, 6)) $$,
  'requests in the same month add up in one row'
);

select * from finish();
rollback;
