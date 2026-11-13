-- Text note limits (T1.1, US-1.1). Uses a synthetic user only.
begin;

create extension if not exists pgtap with schema extensions;

select plan(6);

insert into auth.users (id, email)
values ('33333333-3333-4333-8333-333333333333', 'notes@example.test');

set local role authenticated;
set local request.jwt.claims = '{"sub": "33333333-3333-4333-8333-333333333333", "role": "authenticated"}';

select throws_ok(
  $$ insert into public.sources (type, raw_text) values ('text', null) $$,
  '23514', null,
  'a text note needs text'
);
select throws_ok(
  $$ insert into public.sources (type, raw_text) values ('text', E'  \n  ') $$,
  '23514', null,
  'a text note cannot be only whitespace'
);
select throws_ok(
  $$ insert into public.sources (type, raw_text) values ('text', repeat('a', 20001)) $$,
  '23514', null,
  'a text note is at most 20,000 characters'
);
select lives_ok(
  $$ insert into public.sources (type, raw_text) values ('text', repeat('a', 20000)) $$,
  'a text note of exactly 20,000 characters is accepted'
);
select lives_ok(
  $$ insert into public.sources (type, title, raw_text) values ('text', null, 'Kısa not') $$,
  'a text note without a title is accepted'
);
select lives_ok(
  $$ insert into public.sources (type, raw_text) values ('audio', null) $$,
  'audio sources are not limited by the text note check'
);

select * from finish();
rollback;
