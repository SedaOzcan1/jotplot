# Jotplot Progress

## Current Phase

Faz 2 — audio (complete). Next: Faz 3 (questions over notes and PDFs).

## Status

- [x] Read the project plan in `PROJECT.md`.
- [x] Confirm public visibility for the planned GitHub repository.
- [x] Add project-wide agent guidelines and focused Copilot agent profiles.
- [x] Create the public GitHub repository and connect this workspace as `origin`.
- [x] Push the first commit and define the branch workflow.
- [x] T0.0 Product document and rough wireframes (PR #2).
- [x] T0.1 Nuxt skeleton (PR #3).
- [x] T0.7 Test and CI (PR #4).
- [x] T0.6 Layout (PR #5).
- [x] T0.2 Agent rules and `CLAUDE.md` (PR #7).
- [x] T0.3 Local Supabase with the Nuxt module (PR #8).
- [x] T0.4 Database schema with RLS and pgTAP tests (PR #9).
- [x] T0.5 Email and Google sign-in, protected pages (PR #10).
- [x] Complete T0.0–T0.7 as tracked in `PROJECT.md`.
- [x] T1.1 Note creation screen and notes list (PR #12).
- [x] T1.2 Note analysis Edge Function with Claude Haiku 5.5 (PR #13).
- [x] T1.5 Saving the analysis with proposed tasks (PR #14).
- [x] T1.6 Result screen to review and approve tasks (PR #15).
- [x] T1.7 Kanban board with drag and drop (PR #16).
- [x] T1.4 Monthly AI usage limit (PR #17).
- [x] T1.9 End-to-end test from note to board (PR #19).
- [x] T1.8 Note search and type filters (PR #18).
- [x] T1.3 AI quality check and manual test guide (PR #20).
- [x] Complete T1.1–T1.9 as tracked in `PROJECT.md`.
- [x] T2.1 Speech-to-text provider comparison; Deepgram Nova-3 chosen (PR #23).
- [x] T2.2 Audio recording and upload.
- [x] T2.3 Transcription Edge Function with Deepgram.
- [x] T2.4 Tasks extracted from transcripts automatically.
- [x] T2.5 Transcript with an audio player on the note page.
- [x] Complete T2.1–T2.5 as tracked in `PROJECT.md`.

## Latest Update

2026-11-23: T2.5 is done, and with it Faz 2. Audio notes show a player at the top of the note page (a signed link valid for an hour, renewed once if it expires) and a collapsible transcript with one paragraph per speaker turn. Speaker names appear when more than one speaker was found, a turn's time jumps the player to that moment, and the turn being played is highlighted. The full audio flow now works: record or upload with consent, automatic transcription with Deepgram, automatic task extraction, review, and the board. Next: Faz 3 starts with T3.1, PDF upload and text extraction.

2026-11-23: T2.4 is done. Right after a recording is transcribed, the same background job extracts the summary, decisions, and tasks from the transcript with the note analysis from T1.2 (now shared in `_shared/run-analysis.ts`). It counts one AI request; at the AI limit the transcript is still ready and tasks can be extracted later with "Görevleri çıkar". If extraction fails, only extraction is retried; the recording is never transcribed or billed twice. The note page shows the transcript in a collapsible section above the usual review screen and checks the status while the server works. A local run with a synthetic 41-second recording went from upload to proposed tasks in about 12 seconds. Next: T2.5, the transcript screen with an audio player.

2026-11-23: T2.3 is done. The `transcribe-audio` Edge Function sends a saved recording to Deepgram Nova-3 in one piece and works in the background; the note page starts it on its own and shows "Yazıya dökülüyor…", the transcript, a failure with "Tekrar dene", or the monthly limit. Transcripts are saved with speakers and times, and minutes go to `usage`. Limits are 30 minutes a month on the free plan and 300 on premium, shown on the settings page. A local run with a synthetic 41-second recording was transcribed in about 2 seconds. Next: T2.4, extracting tasks from the transcript automatically.

2026-11-23: T2.2 is done. The new note screen has "Yaz", "Kaydet", and "Dosya yükle" tabs. Recording works in the browser with pause, a timer, and a Screen Wake Lock that keeps the phone screen on; files up to 25 MB can be uploaded. Both need a consent confirmation first, and its time is saved with the note. Uploads show progress, and a failed upload keeps the audio on the page to try again. Files go to a private Storage bucket where each user can reach only their own folder. Audio notes are not transcribed yet. Next: T2.3, the transcription Edge Function with Deepgram.

2026-11-23: T2.1 is done. `npm run eval:stt` compares speech-to-text providers on recordings of synthetic Turkish scripts. Seda chose Deepgram Nova-3: speaker labels and word timestamps, the fastest and cheapest option. Results are in `docs/STT_COMPARISON.md`; the work-note and lecture recordings will be added later to recheck. Next: T2.2, audio upload and recording.

2026-11-18: Faz 1 is complete. T1.1–T1.9 are merged into `main` (PRs #12–#20). The full flow works: write a note, extract a summary, decisions, and tasks with Claude Haiku 5.5, review and edit them, add them to the board, and track them there. Free users can process 50 notes a month. `npm run eval:ai` checks the AI on ten synthetic notes (10/10 passing, about $0.013 per run), and `docs/MANUAL_TESTS.md` is the guide for testing by hand. Next: Faz 2 starts with T2.1, comparing speech-to-text providers on Turkish recordings; the provider is still an open decision.
