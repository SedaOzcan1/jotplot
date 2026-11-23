-- PDF notes and the documents bucket (T3.1). Uses synthetic users only.
begin;

create extension if not exists pgtap with schema extensions;

select plan(11);

insert into auth.users (id, email)
values
  ('e1e1e1e1-e1e1-4e1e-8e1e-e1e1e1e1e1e1', 'pdf-a@example.test'),
  ('e2e2e2e2-e2e2-4e2e-8e2e-e2e2e2e2e2e2', 'pdf-b@example.test');

select is(
  (select row(public, file_size_limit, allowed_mime_types)::text
     from storage.buckets where id = 'documents'),
  '(f,10485760,{application/pdf})',
  'the documents bucket is private, at most 10 MB, and PDF only'
);

insert into public.sources (id, user_id, type, storage_path)
values ('f2f2f2f2-f2f2-4f2f-8f2f-f2f2f2f2f2f2', 'e2e2e2e2-e2e2-4e2e-8e2e-e2e2e2e2e2e2', 'pdf',
        'e2e2e2e2-e2e2-4e2e-8e2e-e2e2e2e2e2e2/f2f2f2f2-f2f2-4f2f-8f2f-f2f2f2f2f2f2.pdf');
insert into storage.objects (bucket_id, name, owner_id)
values ('documents', 'e2e2e2e2-e2e2-4e2e-8e2e-e2e2e2e2e2e2/f2f2f2f2-f2f2-4f2f-8f2f-f2f2f2f2f2f2.pdf',
        'e2e2e2e2-e2e2-4e2e-8e2e-e2e2e2e2e2e2');

set local role authenticated;
set local request.jwt.claims = '{"sub": "e1e1e1e1-e1e1-4e1e-8e1e-e1e1e1e1e1e1", "role": "authenticated"}';

-- Notes -------------------------------------------------------------------------------------------

select throws_ok(
  $$ insert into public.sources (type) values ('pdf') $$,
  '23514', null,
  'a PDF note needs a file'
);
select throws_ok(
  $$ insert into public.sources (id, type, storage_path)
     values ('f1f1f1f1-f1f1-4f1f-8f1f-f1f1f1f1f1f1', 'pdf',
             'e1e1e1e1-e1e1-4e1e-8e1e-e1e1e1e1e1e1/f1f1f1f1-f1f1-4f1f-8f1f-f1f1f1f1f1f1.webm') $$,
  '23514', null,
  'a PDF note needs a .pdf file'
);
select throws_ok(
  $$ insert into public.sources (id, type, storage_path)
     values ('f1f1f1f1-f1f1-4f1f-8f1f-f1f1f1f1f1f1', 'pdf',
             'e2e2e2e2-e2e2-4e2e-8e2e-e2e2e2e2e2e2/f2f2f2f2-f2f2-4f2f-8f2f-f2f2f2f2f2f2.pdf') $$,
  '23514', null,
  'a PDF note cannot point to another user''s file'
);
select lives_ok(
  $$ insert into public.sources (id, type, title, storage_path)
     values ('f1f1f1f1-f1f1-4f1f-8f1f-f1f1f1f1f1f1', 'pdf', 'Ders notları',
             'e1e1e1e1-e1e1-4e1e-8e1e-e1e1e1e1e1e1/f1f1f1f1-f1f1-4f1f-8f1f-f1f1f1f1f1f1.pdf') $$,
  'a PDF note with its own file is accepted, without a consent time'
);

-- Starting extraction -----------------------------------------------------------------------------

select is(public.start_pdf_extraction('f1f1f1f1-f1f1-4f1f-8f1f-f1f1f1f1f1f1'), true, 'a new PDF can start');
select is(public.start_pdf_extraction('f1f1f1f1-f1f1-4f1f-8f1f-f1f1f1f1f1f1'), false, 'the same PDF cannot start twice');
select is(public.start_pdf_extraction('f2f2f2f2-f2f2-4f2f-8f2f-f2f2f2f2f2f2'), false, 'another user''s PDF cannot be started');

update public.sources set status = 'ready', raw_text = 'Metin'
 where id = 'f1f1f1f1-f1f1-4f1f-8f1f-f1f1f1f1f1f1';
select is(public.start_pdf_extraction('f1f1f1f1-f1f1-4f1f-8f1f-f1f1f1f1f1f1'), false, 'a PDF with text is not extracted again');

-- Storage ---------------------------------------------------------------------------------------

select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('documents', 'e2e2e2e2-e2e2-4e2e-8e2e-e2e2e2e2e2e2/x.pdf',
             'e1e1e1e1-e1e1-4e1e-8e1e-e1e1e1e1e1e1') $$,
  '42501', null,
  'a user cannot upload to another user''s folder'
);
select is(
  (select count(*)::int from storage.objects where bucket_id = 'documents'),
  0,
  'a user cannot see another user''s documents'
);

select * from finish();
rollback;
