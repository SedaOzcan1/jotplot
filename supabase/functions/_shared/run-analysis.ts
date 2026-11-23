import Anthropic from '@anthropic-ai/sdk'
import {
  type AnalysisModel,
  type AnalysisUsage,
  type AnalyzeNoteInput,
  type AnalyzeNoteResult,
  type NoteAnalysis,
  type NoteMode,
  todayInIstanbul,
} from './note-analysis.ts'

/**
 * Runs the note analysis and saves the result (T1.2, shared with T2.4). process-note uses it for
 * a request from the browser; transcribe-audio uses it right after a transcript is saved, so
 * tasks are extracted from a recording without the user waiting on the page.
 */

export type NoteStatus = 'processing' | 'ready' | 'failed'

export type AnalysisFailure =
  | 'limit_reached'
  | 'ai_refused'
  | 'ai_incomplete'
  | 'ai_invalid_output'
  | 'ai_unavailable'
  | 'internal'

export type AnalysisOutcome =
  { ok: true; summaryId: string; analysis: NoteAnalysis } | { ok: false; code: AnalysisFailure }

export interface AnalysisSteps {
  model: AnalysisModel
  analyze(input: AnalyzeNoteInput): Promise<AnalyzeNoteResult>
  /** Counts one AI request; false when the user's monthly limit is reached. Service role. */
  reserveRequest(userId: string): Promise<boolean>
  /** Gives back a counted request when the AI never ran. Service role. */
  releaseRequest(userId: string): Promise<void>
  /** Runs with the service role; users cannot write usage themselves. */
  recordUsage(userId: string, usage: AnalysisUsage): Promise<void>
  setStatus(sourceId: string, status: NoteStatus): Promise<void>
  /** Creates or replaces the note's summary; returns the summary id. */
  saveSummary(sourceId: string, analysis: NoteAnalysis): Promise<string>
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

/**
 * Counts the request, marks the note as processing, runs the AI, and saves the summary with the
 * tasks as proposals. When the limit is reached nothing changes and `limit_reached` comes back.
 */
export async function runAnalysis(
  steps: AnalysisSteps,
  input: { userId: string; sourceId: string; text: string; mode: NoteMode },
): Promise<AnalysisOutcome> {
  const log = steps.log ?? (() => {})
  const { userId, sourceId } = input

  // The request is counted before the AI runs so parallel requests cannot pass the limit.
  try {
    if (!(await steps.reserveRequest(userId))) return { ok: false, code: 'limit_reached' }
    await steps.setStatus(sourceId, 'processing')
  } catch (error) {
    log('Checking the usage limit failed', { sourceId, error: String(error) })
    return { ok: false, code: 'internal' }
  }

  let aiRan = false
  try {
    const result = await steps.analyze({
      text: input.text,
      mode: input.mode,
      model: steps.model,
      today: todayInIstanbul(steps.now?.() ?? new Date()),
    })
    aiRan = true

    try {
      await steps.recordUsage(userId, result.usage)
    } catch (error) {
      // The user still gets their result; the missing usage row is logged for follow-up.
      log('Recording AI usage failed', { sourceId, error: String(error) })
    }

    if (!result.analysis) {
      const code = result.error?.code ?? 'ai_invalid_output'
      log('AI output was not usable', { sourceId, code })
      await steps.setStatus(sourceId, 'failed')
      return { ok: false, code }
    }

    const summaryId = await steps.saveSummary(sourceId, result.analysis)
    await steps.setStatus(sourceId, 'ready')
    return { ok: true, summaryId, analysis: result.analysis }
  } catch (error) {
    log('Processing a note failed', { sourceId, error: String(error) })
    // Nothing was billed when the AI never answered, so the request does not count.
    if (!aiRan) {
      await steps.releaseRequest(userId).catch((releaseError: unknown) => {
        log('Giving back an AI request failed', { sourceId, error: String(releaseError) })
      })
    }
    await steps.setStatus(sourceId, 'failed').catch(() => {})
    return { ok: false, code: isTemporaryApiError(error) ? 'ai_unavailable' : 'internal' }
  }
}
