-- Audio notes (T2.2, US-2.1): recordings are uploaded to a private Storage bucket and the note
-- row points to the file. Before recording or uploading, the user confirms that everyone in the
-- recording agreed (KVKK); the time of that confirmation is kept with the note.

alter table public.sources add column consent_confirmed_at timestamptz;

-- An audio note needs the consent time and a file in the user's own folder, named after the note:
-- "<user_id>/<note id>.<extension>". Matches AUDIO_EXTENSIONS in app/utils/audio.ts.
-- NOT VALID: audio rows made before this migration (local test data only) are left as they are.
alter table public.sources
  add constraint sources_audio_file check (
    type <> 'audio'
    or (
      consent_confirmed_at is not null
      and storage_path is not null
      and storage_path ~ (
        '^' || user_id::text || '/' || id::text || '\.(webm|ogg|mp3|m4a|mp4|wav|aac|flac)$'
      )
    )
  ) not valid;

-- Private bucket, at most 25 MB per file (AUDIO_MAX_BYTES), audio files only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recordings', 'recordings', false, 26214400, array['audio/*']);

-- Users can upload, read, and delete files only in their own folder. There is no update policy,
-- so a recording cannot be overwritten.
create policy "Users upload recordings to their own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'recordings' and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users read their own recordings"
  on storage.objects for select to authenticated
  using (bucket_id = 'recordings' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users delete their own recordings"
  on storage.objects for delete to authenticated
  using (bucket_id = 'recordings' and (storage.foldername(name))[1] = (select auth.uid())::text);
