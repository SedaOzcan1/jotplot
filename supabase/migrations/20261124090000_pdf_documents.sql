-- PDF notes (T3.1): the file goes to a private Storage bucket and the extract-pdf Edge Function
-- saves its text as the note's raw_text, for search, task extraction, and later questions (Faz 3).
-- At most 10 MB and 100 pages (DECISIONS.md); the page count is checked by the function.

-- A PDF note points to a file in the user's own folder, named after the note.
-- NOT VALID: PDF rows made before this migration (local test data only) are left as they are.
alter table public.sources
  add constraint sources_pdf_file check (
    type <> 'pdf'
    or (
      storage_path is not null
      and storage_path ~ ('^' || user_id::text || '/' || id::text || '\.pdf$')
    )
  ) not valid;

-- Private bucket, at most 10 MB per file (PDF_MAX_BYTES in app/utils/pdf.ts), PDF only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 10485760, array['application/pdf']);

-- Users can upload, read, and delete files only in their own folder; files cannot be overwritten.
create policy "Users upload documents to their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users read their own documents"
  on storage.objects for select to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users delete their own documents"
  on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Marks a PDF as having its text extracted. Returns false when that is already running or done,
-- so two requests never extract the same file. One stuck for over 10 minutes can start again.
-- Runs with the caller's permissions, so users can only start their own notes.
create function public.start_pdf_extraction(p_source_id uuid)
returns boolean
language sql
set search_path = ''
as $$
  with started as (
    update public.sources
       set status = 'processing'
     where id = p_source_id
       and type = 'pdf'
       and raw_text is null
       and (
         status in ('pending', 'failed')
         or (status = 'processing' and updated_at < now() - interval '10 minutes')
       )
    returning 1
  )
  select exists (select 1 from started);
$$;

revoke execute on function public.start_pdf_extraction(uuid) from public, anon;
grant execute on function public.start_pdf_extraction(uuid) to authenticated;
