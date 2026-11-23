import { z } from 'zod'

/**
 * Speech-to-text with Deepgram Nova-3 (T2.1 decision, T2.3). Runs in the Edge Function; the API key
 * never reaches the browser. Shared code only: no Deno or Node specific APIs.
 */

/** List price per audio minute for Nova-3 pre-recorded, checked on 2026-11-23. */
export const DEEPGRAM_USD_PER_MINUTE = 0.0043

export interface TranscriptSegment {
  /** Seconds from the start of the recording. */
  start: number
  end: number
  /** Deepgram's speaker number (0, 1, …), or null when it could not tell. */
  speaker: number | null
  text: string
}

export interface Transcript {
  /** The whole transcript, one line per speaker turn. */
  text: string
  language: string
  durationSec: number
  segments: TranscriptSegment[]
}

export type TranscriptionErrorCode =
  /** Network problem, rate limit, or Deepgram server error: worth trying again later. */
  | 'stt_unavailable'
  /** Deepgram refused the file, for example because it is not valid audio. */
  | 'stt_rejected'
  /** The recording has no speech Deepgram could recognize. */
  | 'no_speech'
  /** The answer did not have the expected shape. */
  | 'stt_invalid_output'

export class TranscriptionError extends Error {
  code: TranscriptionErrorCode

  constructor(code: TranscriptionErrorCode, message?: string) {
    super(message ?? code)
    this.name = 'TranscriptionError'
    this.code = code
  }
}

const deepgramSchema = z.object({
  metadata: z.object({ duration: z.number().nonnegative() }),
  results: z.object({
    channels: z
      .array(
        z.object({
          alternatives: z.array(z.object({ transcript: z.string() })).min(1),
        }),
      )
      .min(1),
    utterances: z
      .array(
        z.object({
          start: z.number(),
          end: z.number(),
          speaker: z.number().int().nonnegative().optional(),
          transcript: z.string(),
        }),
      )
      .optional(),
  }),
})

/**
 * Deepgram splits speech at short pauses, often mid-sentence. Consecutive pieces from the same
 * speaker are joined into one line; a new line starts when the speaker changes.
 */
function joinBySpeaker(segments: TranscriptSegment[]): string {
  const lines: string[] = []
  let previous: number | null | undefined
  for (const segment of segments) {
    if (lines.length && segment.speaker === previous) lines[lines.length - 1] += ` ${segment.text}`
    else lines.push(segment.text)
    previous = segment.speaker
  }
  return lines.join('\n')
}

export function parseDeepgramResponse(json: unknown, language = 'tr'): Transcript {
  const parsed = deepgramSchema.safeParse(json)
  if (!parsed.success) throw new TranscriptionError('stt_invalid_output', parsed.error.message)
  const { metadata, results } = parsed.data

  const segments = (results.utterances ?? [])
    .map((utterance) => ({
      start: utterance.start,
      end: utterance.end,
      speaker: utterance.speaker ?? null,
      text: utterance.transcript.trim(),
    }))
    .filter((segment) => segment.text)
  const text = segments.length
    ? joinBySpeaker(segments)
    : results.channels[0]!.alternatives[0]!.transcript.trim()

  if (!text) throw new TranscriptionError('no_speech')
  return { text, language, durationSec: metadata.duration, segments }
}

/** Minutes counted against the monthly limit, to two decimals (as stored in `usage`). */
export function billableMinutes(durationSec: number): number {
  return Math.ceil((durationSec / 60) * 100) / 100
}

export function transcriptionCostUsd(durationSec: number): number {
  return Number(((durationSec / 60) * DEEPGRAM_USD_PER_MINUTE).toFixed(6))
}

export interface TranscribeOptions {
  apiKey: string
  audio: Blob
  /** Defaults to the global fetch; tests pass a fake. */
  fetch?: typeof fetch
}

/**
 * Sends the recording to Deepgram in one piece (Seda chose not to split recordings; files are at
 * most 25 MB) with speaker labels and per-utterance times.
 */
export async function transcribeWithDeepgram(options: TranscribeOptions): Promise<Transcript> {
  const params = new URLSearchParams({
    model: 'nova-3',
    language: 'tr',
    smart_format: 'true',
    punctuate: 'true',
    diarize: 'true',
    utterances: 'true',
  })
  let response: Response
  try {
    response = await (options.fetch ?? fetch)(`https://api.deepgram.com/v1/listen?${params}`, {
      method: 'POST',
      headers: {
        Authorization: `Token ${options.apiKey}`,
        'Content-Type': options.audio.type || 'application/octet-stream',
      },
      body: options.audio,
    })
  } catch (error) {
    throw new TranscriptionError('stt_unavailable', String(error))
  }

  if (!response.ok) {
    const detail = (await response.text().catch(() => '')).slice(0, 300)
    const temporary = response.status === 429 || response.status >= 500
    throw new TranscriptionError(
      temporary ? 'stt_unavailable' : 'stt_rejected',
      `Deepgram ${response.status}: ${detail}`,
    )
  }
  return parseDeepgramResponse(await response.json().catch(() => null))
}
