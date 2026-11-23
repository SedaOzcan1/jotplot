import { z } from 'zod'
import type { NoteMode } from '../_shared/note-analysis.ts'
import { type AnalysisSteps, type NoteStatus, runAnalysis } from '../_shared/run-analysis.ts'

export type { NoteStatus } from '../_shared/run-analysis.ts'

/**
 * POST /functions/v1/process-note with `{ "sourceId": "<uuid>" }` and the user's access token.
 * Reads the note with the user's own permissions (Row Level Security), runs the analysis, saves
 * the summary with the extracted tasks as proposals (they reach the board only after the user
 * approves them), and returns the result. A text note is analyzed by its text, a recording by its
 * transcript (T2.4), and a PDF by the text extracted from it (T3.1).
 */

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export const requestSchema = z.object({ sourceId: z.uuid() })

export type ErrorCode =
  | 'invalid_request'
  | 'not_signed_in'
  | 'note_not_found'
  | 'unsupported_note'
  | 'limit_reached'
  | 'ai_refused'
  | 'ai_incomplete'
  | 'ai_invalid_output'
  | 'ai_unavailable'
  | 'internal'

const ERRORS: Record<ErrorCode, { status: number; message: string }> = {
  invalid_request: { status: 400, message: 'İstek geçersiz.' },
  not_signed_in: { status: 401, message: 'Oturumun sona ermiş. Tekrar giriş yap.' },
  note_not_found: { status: 404, message: 'Not bulunamadı.' },
  unsupported_note: { status: 422, message: 'Bu not türü henüz işlenemiyor.' },
  limit_reached: {
    status: 429,
    message:
      'Bu ayki AI işleme hakkını doldurdun. Notun kaydedildi; hakkın gelecek ayın ilk günü yenilenir.',
  },
  ai_refused: {
    status: 422,
    message: 'Bu not işlenemedi. Metni gözden geçirip tekrar dene.',
  },
  ai_incomplete: {
    status: 502,
    message: 'Sonuç tamamlanamadı. Tekrar dene; notun kaydedildi.',
  },
  ai_invalid_output: {
    status: 502,
    message: 'Sonuç okunamadı. Tekrar dene; notun kaydedildi.',
  },
  ai_unavailable: {
    status: 503,
    message: 'AI servisine şu an ulaşılamıyor. Biraz sonra tekrar dene; notun kaydedildi.',
  },
  internal: { status: 500, message: 'Bir sorun oluştu. Tekrar dene; notun kaydedildi.' },
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

export function errorResponse(code: ErrorCode): Response {
  const { status, message } = ERRORS[code]
  return json({ error: { code, message } }, status)
}

export interface Note {
  id: string
  type: string
  mode: NoteMode
  raw_text: string | null
  /** The transcript of a recording, once it exists. */
  transcript?: string | null
}

/** Data access with the signed-in user's permissions. */
export interface UserScope {
  userId: string
  loadNote(sourceId: string): Promise<Note | null>
  setStatus(sourceId: string, status: NoteStatus): Promise<void>
  /** Creates or replaces the note's summary; returns the summary id. */
  saveSummary: AnalysisSteps['saveSummary']
}

export interface ProcessNoteDeps extends Omit<AnalysisSteps, 'setStatus' | 'saveSummary'> {
  /** Returns null when the access token is missing or invalid. */
  userScope(authorization: string | null): Promise<UserScope | null>
}

/** The text the AI reads: a text note's or PDF's text, or a recording's transcript. */
export function analysisText(note: Note): string | null {
  if (note.type === 'text' || note.type === 'pdf') {
    return note.raw_text?.trim() ? note.raw_text : null
  }
  if (note.type === 'audio') return note.transcript?.trim() ? note.transcript : null
  return null
}

export function createHandler(deps: ProcessNoteDeps) {
  const log = deps.log ?? (() => {})

  return async function handle(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
    if (request.method !== 'POST') return errorResponse('invalid_request')

    const scope = await deps.userScope(request.headers.get('Authorization'))
    if (!scope) return errorResponse('not_signed_in')

    const body = requestSchema.safeParse(await request.json().catch(() => null))
    if (!body.success) return errorResponse('invalid_request')
    const { sourceId } = body.data

    let note: Note | null
    try {
      note = await scope.loadNote(sourceId)
    } catch (error) {
      log('Loading the note failed', { sourceId, error: String(error) })
      return errorResponse('internal')
    }
    if (!note) return errorResponse('note_not_found')
    const text = analysisText(note)
    if (!text) return errorResponse('unsupported_note')

    const outcome = await runAnalysis(
      { ...deps, setStatus: scope.setStatus, saveSummary: scope.saveSummary },
      { userId: scope.userId, sourceId, text, mode: note.mode },
    )
    if (!outcome.ok) return errorResponse(outcome.code)
    return json({ sourceId, summaryId: outcome.summaryId, analysis: outcome.analysis })
  }
}
