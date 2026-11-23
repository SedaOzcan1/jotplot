# Speech-to-Text Comparison (T2.1)

Date: 2026-11-23. Tool: `npm run eval:stt` (`evals/stt/`). The scripts read aloud are synthetic and live in `evals/stt/cases.ts`; recordings and transcripts stay in git-ignored folders.

## Candidates

| Provider | Price (list, per minute) | Speaker labels | Word timestamps | Status |
|---|---|---|---|---|
| OpenAI `whisper-1` | $0.006 | no | yes | shuts down 2027-02-26 |
| OpenAI `gpt-transcribe` | $0.0045 | no | no | current |
| OpenAI `gpt-4o-transcribe-diarize` | $0.006 | yes (per segment) | no | shuts down 2027-02-26 |
| Deepgram Nova-3 (`language=tr`) | $0.0043, diarization included | yes (per word) | yes | current |

## Results

Word error rate (WER) compares the transcript with the script after normalizing numbers ("12" = "on iki"), case, and punctuation.

**Two-person dialogue, recorded by Seda (51 s):**

| Provider | WER | Speakers | Turns correct | Time |
|---|---|---|---|---|
| Whisper | 3.6% | — | — | 4.4 s |
| gpt-transcribe | 2.4% | — | — | 3.0 s |
| diarize | 10.8% | 2 | 8/8 | 23.9 s |
| Deepgram Nova-3 | 7.2% | 2 | 8/8 (97.6% of words) | 1.9 s |

All four heard "ben de" and a closing "okay", which count as errors against the script.

**Synthetic voice (macOS "Yelda"), work note and lecture, average WER:**
- Whisper: 11.1%
- gpt-transcribe: 1.4%
- diarize: 6.5%
- Deepgram: 11.4%

Deepgram missed the English terms in the lecture ("AVL", "red-black tree", "binary search tree"). With Deepgram's `keyterm` hints for those three terms, it wrote all of them correctly. A synthetic voice is only a smoke test.

## Decision

Deepgram Nova-3. It is the only current option with speaker labels and word timestamps, it is the fastest and cheapest, and its text errors are small enough for the note analysis that follows. `gpt-transcribe` writes the most accurate text but cannot tell speakers apart or align text with audio.

## Follow-ups

- Run `npm run eval:stt` again when the work-note and lecture recordings are added.
- T2.3: pass known names and terms as `keyterm` hints where available.
