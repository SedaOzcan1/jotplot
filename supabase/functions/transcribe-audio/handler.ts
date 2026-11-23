import { z } from 'zod'
import type { NoteAnalysis, NoteMode } from '../_shared/note-analysis.ts'
import { type AnalysisSteps, type NoteStatus, runAnalysis } from '../_shared/run-analysis.ts'
import {
  billableMinutes,
  type Transcript,
  TranscriptionError,
  transcriptionCostUsd,
} from '../_shared/transcription.ts'

/**
 * Transcribes an audio note (T2.3, US-2.2) and then extracts its summary and tasks from the
 * transcript (T2.4). Answers right away with 202 and keeps working in the background, so a long
 * recording does not keep the browser waiting; the note's status shows the progress
 * (processing → ready or failed). Kept free of Deno APIs so it can be tested with Vitest.
 */

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export type ErrorCode =
  | 'invalid_request'
  | 'not_signed_in'
  | 'note_not_found'
  | 'unsupported_note'
  | 'limit_reached'
  | 'internal'

const ERRORS: Record<ErrorCode, { status: number; message: string }> = {
  invalid_request: { status: 400, message: 'İstek geçersiz.' },
  not_signed_in: { status: 401, message: 'Oturumun sona ermiş. Tekrar giriş yap.' },
  note_not_found: { status: 404, message: 'Kayıt bulunamadı.' },
  unsupported_note: { status: 400, message: 'Bu not bir ses kaydı değil.' },
  limit_reached: {
    status: 429,
    message:
      'Bu ayki ses dakikan doldu. Kaydın saklanıyor; hakkın yenilenince yazıya dökebilirsin.',
  },
  internal: {
    status: 500,
    message: 'Kayıt yazıya dökülemedi. Biraz sonra tekrar dene; kaydın saklanıyor.',
  },
}

const requestSchema = z.object({ sourceId: z.uuid() })

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

export function errorResponse(code: ErrorCode): Response {
  const { status, message } = ERRORS[code]
  return json({ error: { code, message } }, status)
}

export interface AudioNote {
  id: string
  type: string
  mode: NoteMode
  status: string
  storage_path: string | null
  /** True once the recording has a transcript; it is never transcribed (and billed) again. */
  transcribed: boolean
}

/** Data access with the signed-in user's permissions. */
export interface UserScope {
  userId: string
  loadNote(sourceId: string): Promise<AudioNote | null>
  /** Marks the note as processing; false when it is already being transcribed or done. */
  startTranscription(sourceId: string): Promise<boolean>
}

export interface TranscribeAudioDeps extends Omit<AnalysisSteps, 'setStatus' | 'saveSummary'> {
  /** Returns null when the access token is missing or invalid. */
  userScope(authorization: string | null): Promise<UserScope | null>
  /** Minutes left this month. Service role. */
  minutesRemaining(userId: string): Promise<number>
  /** Reads the recording from Storage. Service role. */
  downloadAudio(storagePath: string): Promise<Blob>
  transcribe(audio: Blob): Promise<Transcript>
  /** Creates or replaces the note's transcript. Service role; users cannot write transcripts. */
  saveTranscript(userId: string, sourceId: string, transcript: Transcript): Promise<void>
  /** Adds recording minutes and their cost to the user's usage. Service role. */
  recordMinutes(userId: string, minutes: number, costUsd: number): Promise<void>
  /** Service role, so the background work does not depend on the user's token staying valid. */
  setStatus(sourceId: string, status: NoteStatus): Promise<void>
  /** Creates or replaces the note's summary; returns its id. Service role. */
  saveSummary(userId: string, sourceId: string, analysis: NoteAnalysis): Promise<string>
  /** Keeps the work running after the response is sent (EdgeRuntime.waitUntil). */
  runInBackground(work: Promise<void>): void
}

/** The background part: download, transcribe, save, count the minutes, then extract tasks. */
export async function transcribeNote(
  deps: TranscribeAudioDeps,
  userId: string,
  note: AudioNote & { storage_path: string },
): Promise<void> {
  const log = deps.log ?? (() => {})
  let transcribed = false
  try {
    const audio = await deps.downloadAudio(note.storage_path)
    const transcript = await deps.transcribe(audio)
    await deps.saveTranscript(userId, note.id, transcript)
    try {
      await deps.recordMinutes(
        userId,
        billableMinutes(transcript.durationSec),
        transcriptionCostUsd(transcript.durationSec),
      )
    } catch (error) {
      // The user still gets the transcript; the missing usage is logged for follow-up.
      log('Recording speech-to-text usage failed', { sourceId: note.id, error: String(error) })
    }
    transcribed = true

    // Tasks come from the transcript right away, as for a text note (T2.4).
    const outcome = await runAnalysis(
      {
        ...deps,
        saveSummary: (sourceId, analysis) => deps.saveSummary(userId, sourceId, analysis),
      },
      { userId, sourceId: note.id, text: transcript.text, mode: note.mode },
    )
    if (!outcome.ok) {
      log('Extracting tasks from a transcript failed', { sourceId: note.id, code: outcome.code })
      // At the AI limit the transcript is still ready; tasks can be extracted next month.
      await deps.setStatus(note.id, outcome.code === 'limit_reached' ? 'ready' : 'failed')
    }
  } catch (error) {
    if (transcribed) {
      log('Finishing a transcribed recording failed', { sourceId: note.id, error: String(error) })
      await deps.setStatus(note.id, 'failed').catch(() => {})
      return
    }
    log('Transcribing a recording failed', {
      sourceId: note.id,
      code: error instanceof TranscriptionError ? error.code : 'internal',
      error: String(error),
    })
    await deps.setStatus(note.id, 'failed').catch((statusError: unknown) => {
      log('Marking a recording as failed failed', { sourceId: note.id, error: String(statusError) })
    })
  }
}

export function createHandler(deps: TranscribeAudioDeps) {
  const log = deps.log ?? (() => {})

  return async function handle(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
    if (request.method !== 'POST') return errorResponse('invalid_request')

    const scope = await deps.userScope(request.headers.get('Authorization'))
    if (!scope) return errorResponse('not_signed_in')

    const body = requestSchema.safeParse(await request.json().catch(() => null))
    if (!body.success) return errorResponse('invalid_request')
    const { sourceId } = body.data

    try {
      const note = await scope.loadNote(sourceId)
      if (!note) return errorResponse('note_not_found')
      if (note.type !== 'audio' || !note.storage_path) return errorResponse('unsupported_note')
      // Already transcribed: a retry of the task extraction goes through process-note instead.
      if (note.transcribed || note.status === 'ready') {
        return json({ sourceId, status: note.status })
      }

      if ((await deps.minutesRemaining(scope.userId)) <= 0) return errorResponse('limit_reached')
      // Only one request may transcribe a note; the others report that it is already running.
      if (!(await scope.startTranscription(sourceId))) {
        return json({ sourceId, status: 'processing' }, 202)
      }

      deps.runInBackground(
        transcribeNote(deps, scope.userId, { ...note, storage_path: note.storage_path }),
      )
      return json({ sourceId, status: 'processing' }, 202)
    } catch (error) {
      log('Starting a transcription failed', { sourceId, error: String(error) })
      return errorResponse('internal')
    }
  }
}
