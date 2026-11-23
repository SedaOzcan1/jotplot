import Anthropic from '@anthropic-ai/sdk'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AnalysisError } from '../../supabase/functions/_shared/note-analysis'
import {
  createHandler,
  type Note,
  type ProcessNoteDeps,
} from '../../supabase/functions/process-note/handler'

const SOURCE_ID = 'aaaaaaaa-0000-4000-8000-000000000001'
const usage = { model: 'claude-haiku-5-5' as const, inputTokens: 10, outputTokens: 5, costUsd: 0.1 }
const analysis = { summary: 'Özet', decisions: [], tasks: [], concepts: [], questions: [] }

let note: Note | null
let deps: ProcessNoteDeps & {
  setStatus: ReturnType<typeof vi.fn>
  saveSummary: ReturnType<typeof vi.fn>
  analyze: ReturnType<typeof vi.fn>
  reserveRequest: ReturnType<typeof vi.fn>
  releaseRequest: ReturnType<typeof vi.fn>
  recordUsage: ReturnType<typeof vi.fn>
}

beforeEach(() => {
  note = { id: SOURCE_ID, type: 'text', mode: 'work', raw_text: 'Toplantı notu' }
  const setStatus = vi.fn().mockResolvedValue(undefined)
  const saveSummary = vi.fn().mockResolvedValue('summary-1')
  deps = {
    model: 'claude-haiku-5-5',
    userScope: async (authorization) =>
      authorization === 'Bearer valid'
        ? { userId: 'user-1', loadNote: async () => note, setStatus, saveSummary }
        : null,
    analyze: vi.fn().mockResolvedValue({ analysis, usage }),
    reserveRequest: vi.fn().mockResolvedValue(true),
    releaseRequest: vi.fn().mockResolvedValue(undefined),
    recordUsage: vi.fn().mockResolvedValue(undefined),
    setStatus,
    saveSummary,
    now: () => new Date('2026-11-13T09:00:00Z'),
  }
})

function post(body: unknown, authorization = 'Bearer valid') {
  return createHandler(deps)(
    new Request('http://localhost/functions/v1/process-note', {
      method: 'POST',
      headers: { Authorization: authorization, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  )
}

async function errorCode(response: Response) {
  return ((await response.json()) as { error: { code: string } }).error.code
}

describe('process-note', () => {
  it('answers the browser’s CORS preflight', async () => {
    const response = await createHandler(deps)(
      new Request('http://localhost/', { method: 'OPTIONS' }),
    )
    expect(response.status).toBe(200)
    expect(response.headers.get('Access-Control-Allow-Headers')).toContain('authorization')
  })

  it('rejects requests without a valid session', async () => {
    const response = await post({ sourceId: SOURCE_ID }, 'Bearer expired')

    expect(response.status).toBe(401)
    expect(await errorCode(response)).toBe('not_signed_in')
    expect(deps.analyze).not.toHaveBeenCalled()
  })

  it('rejects a body without a valid note id', async () => {
    const response = await post({ sourceId: 'not-a-uuid' })

    expect(response.status).toBe(400)
    expect(await errorCode(response)).toBe('invalid_request')
  })

  it('returns 404 for a note the user cannot see', async () => {
    note = null

    const response = await post({ sourceId: SOURCE_ID })

    expect(response.status).toBe(404)
    expect(deps.setStatus).not.toHaveBeenCalled()
  })

  it('analyzes the note, saves the summary, records usage, and marks the note ready', async () => {
    const response = await post({ sourceId: SOURCE_ID })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ sourceId: SOURCE_ID, summaryId: 'summary-1', analysis })
    expect(deps.saveSummary).toHaveBeenCalledWith(SOURCE_ID, analysis)
    expect(deps.analyze).toHaveBeenCalledWith({
      text: 'Toplantı notu',
      mode: 'work',
      model: 'claude-haiku-5-5',
      today: '2026-11-13',
    })
    expect(deps.recordUsage).toHaveBeenCalledWith('user-1', usage)
    expect(deps.setStatus.mock.calls).toEqual([
      [SOURCE_ID, 'processing'],
      [SOURCE_ID, 'ready'],
    ])
  })

  it('records usage and marks the note failed when the AI output is unusable', async () => {
    deps.analyze.mockResolvedValue({
      usage,
      error: new AnalysisError('ai_invalid_output', 'bad'),
    })

    const response = await post({ sourceId: SOURCE_ID })

    expect(response.status).toBe(502)
    const body = (await response.json()) as { error: { code: string; message: string } }
    expect(body.error.code).toBe('ai_invalid_output')
    expect(body.error.message).toContain('notun kaydedildi')
    expect(deps.recordUsage).toHaveBeenCalledWith('user-1', usage)
    expect(deps.saveSummary).not.toHaveBeenCalled()
    expect(deps.setStatus).toHaveBeenLastCalledWith(SOURCE_ID, 'failed')
  })

  it('marks the note failed when the summary cannot be saved', async () => {
    deps.saveSummary.mockRejectedValue(new Error('db down'))

    const response = await post({ sourceId: SOURCE_ID })

    expect(response.status).toBe(500)
    expect(await errorCode(response)).toBe('internal')
    expect(deps.recordUsage).toHaveBeenCalled()
    expect(deps.setStatus).toHaveBeenLastCalledWith(SOURCE_ID, 'failed')
  })

  it('counts the request before running the AI', async () => {
    await post({ sourceId: SOURCE_ID })

    expect(deps.reserveRequest).toHaveBeenCalledWith('user-1')
    expect(deps.reserveRequest.mock.invocationCallOrder[0]).toBeLessThan(
      deps.analyze.mock.invocationCallOrder[0]!,
    )
    expect(deps.releaseRequest).not.toHaveBeenCalled()
  })

  it('stops with a clear message when the monthly limit is reached', async () => {
    deps.reserveRequest.mockResolvedValue(false)

    const response = await post({ sourceId: SOURCE_ID })

    expect(response.status).toBe(429)
    const body = (await response.json()) as { error: { code: string; message: string } }
    expect(body.error.code).toBe('limit_reached')
    expect(body.error.message).toContain('Notun kaydedildi')
    expect(deps.analyze).not.toHaveBeenCalled()
    // The note keeps its status, so it can be processed next month.
    expect(deps.setStatus).not.toHaveBeenCalled()
  })

  it('does not check the limit for a note the user cannot see', async () => {
    note = null

    await post({ sourceId: SOURCE_ID })

    expect(deps.reserveRequest).not.toHaveBeenCalled()
  })

  it('gives the request back when the AI service could not be reached', async () => {
    deps.analyze.mockRejectedValue(new Anthropic.APIConnectionError({ message: 'offline' }))

    await post({ sourceId: SOURCE_ID })

    expect(deps.releaseRequest).toHaveBeenCalledWith('user-1')
  })

  it('keeps the request counted when the AI answered but saving failed', async () => {
    deps.saveSummary.mockRejectedValue(new Error('db down'))

    await post({ sourceId: SOURCE_ID })

    expect(deps.releaseRequest).not.toHaveBeenCalled()
  })

  it('keeps the request counted when the AI answer was unusable', async () => {
    deps.analyze.mockResolvedValue({ usage, error: new AnalysisError('ai_invalid_output', 'bad') })

    await post({ sourceId: SOURCE_ID })

    expect(deps.releaseRequest).not.toHaveBeenCalled()
  })

  it('reports a rate limit or network error as temporary', async () => {
    deps.analyze.mockRejectedValue(new Anthropic.APIConnectionError({ message: 'offline' }))

    const response = await post({ sourceId: SOURCE_ID })

    expect(response.status).toBe(503)
    expect(await errorCode(response)).toBe('ai_unavailable')
    expect(deps.recordUsage).not.toHaveBeenCalled()
    expect(deps.setStatus).toHaveBeenLastCalledWith(SOURCE_ID, 'failed')
  })

  it('still returns the result when recording usage fails', async () => {
    deps.recordUsage.mockRejectedValue(new Error('db down'))

    const response = await post({ sourceId: SOURCE_ID })

    expect(response.status).toBe(200)
  })

  it('analyzes a recording by its transcript', async () => {
    note = {
      id: SOURCE_ID,
      type: 'audio',
      mode: 'work',
      raw_text: null,
      transcript: 'Ece görselleri cuma gününe kadar hazırlayacak.',
    }

    const response = await post({ sourceId: SOURCE_ID })

    expect(response.status).toBe(200)
    expect(deps.analyze).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'Ece görselleri cuma gününe kadar hazırlayacak.' }),
    )
  })

  it('does not process a recording before its transcript exists, or a PDF yet', async () => {
    note = { id: SOURCE_ID, type: 'audio', mode: 'work', raw_text: null, transcript: null }
    expect(await errorCode(await post({ sourceId: SOURCE_ID }))).toBe('unsupported_note')

    note = { id: SOURCE_ID, type: 'pdf', mode: 'work', raw_text: null }
    expect(await errorCode(await post({ sourceId: SOURCE_ID }))).toBe('unsupported_note')
    expect(deps.reserveRequest).not.toHaveBeenCalled()
  })
})
