import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import {
  type AnalysisModel,
  type AnalysisUsage,
  type AnalyzeNoteInput,
  type AnalyzeNoteResult,
  type NoteAnalysis,
  type NoteMode,
  todayInIstanbul,
} from '../_shared/note-analysis.ts'

/**
 * POST /functions/v1/process-note with `{ "sourceId": "<uuid>" }` and the user's access token.
 * Reads the note with the user's own permissions (Row Level Security), runs the analysis, saves
 * the summary with the extracted tasks as proposals (they reach the board only after the user
 * approves them), and returns the result.
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
}

export type NoteStatus = 'processing' | 'ready' | 'failed'

/** Data access with the signed-in user's permissions. */
export interface UserScope {
  userId: string
  loadNote(sourceId: string): Promise<Note | null>
  setStatus(sourceId: string, status: NoteStatus): Promise<void>
  /** Creates or replaces the note's summary; returns the summary id. */
  saveSummary(sourceId: string, analysis: NoteAnalysis): Promise<string>
}

export interface ProcessNoteDeps {
  model: AnalysisModel
  /** Returns null when the access token is missing or invalid. */
  userScope(authorization: string | null): Promise<UserScope | null>
  analyze(input: AnalyzeNoteInput): Promise<AnalyzeNoteResult>
  /** Runs with the service role; users cannot write usage themselves. */
  recordUsage(userId: string, usage: AnalysisUsage): Promise<void>
  now?: () => Date
  log?: (message: string, details?: Record<string, unknown>) => void
}

/** Network problems, rate limits, and overloaded or failing servers are worth retrying later. */
function isTemporaryApiError(error: unknown): boolean {
  if (error instanceof Anthropic.APIConnectionError) return true
  if (error instanceof Anthropic.APIError) {
    return error.status === 429 || (error.status !== undefined && error.status >= 500)
  }
  return false
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
      if (note?.type === 'text' && note.raw_text) await scope.setStatus(sourceId, 'processing')
    } catch (error) {
      log('Loading the note failed', { sourceId, error: String(error) })
      return errorResponse('internal')
    }
    if (!note) return errorResponse('note_not_found')
    if (note.type !== 'text' || !note.raw_text) return errorResponse('unsupported_note')

    try {
      const result = await deps.analyze({
        text: note.raw_text,
        mode: note.mode,
        model: deps.model,
        today: todayInIstanbul(deps.now?.() ?? new Date()),
      })

      try {
        await deps.recordUsage(scope.userId, result.usage)
      } catch (error) {
        // The user still gets their result; the missing usage row is logged for follow-up.
        log('Recording AI usage failed', { sourceId, error: String(error) })
      }

      if (!result.analysis) {
        const code = result.error?.code ?? 'ai_invalid_output'
        log('AI output was not usable', { sourceId, code })
        await scope.setStatus(sourceId, 'failed')
        return errorResponse(code)
      }

      const summaryId = await scope.saveSummary(sourceId, result.analysis)
      await scope.setStatus(sourceId, 'ready')
      return json({ sourceId, summaryId, analysis: result.analysis })
    } catch (error) {
      log('Processing a note failed', { sourceId, error: String(error) })
      await scope.setStatus(sourceId, 'failed').catch(() => {})
      return errorResponse(isTemporaryApiError(error) ? 'ai_unavailable' : 'internal')
    }
  }
}
