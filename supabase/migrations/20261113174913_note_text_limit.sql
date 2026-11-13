-- Text notes (T1.1, US-1.1): the text is required and at most 20,000 characters.
-- Matches NOTE_TEXT_MAX_LENGTH in app/utils/notes.ts. Audio and PDF sources are not limited here;
-- their text comes from transcription or extraction.

alter table public.sources
  add constraint sources_text_note_length check (
    type <> 'text'
    -- `\S` requires at least one character that is not whitespace (spaces, tabs, or newlines).
    or (raw_text is not null and raw_text ~ '\S' and char_length(raw_text) <= 20000)
  );
