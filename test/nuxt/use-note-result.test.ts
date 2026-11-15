import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProcessNoteError } from '~/composables/useNoteResult'

const { client } = vi.hoisted(() => {
  const query = {
    update: vi.fn(),
    eq: vi.fn(),
    result: { error: null as unknown },
  }
  query.update.mockReturnValue(query)
  query.eq.mockImplementation(() => Promise.resolve(query.result))
  return {
    client: {
      query,
      from: vi.fn(() => query),
      rpc: vi.fn(),
      functions: { invoke: vi.fn() },
    },
  }
})

mockNuxtImport('useSupabaseClient', () => () => client)

const payload = {
  summary: 'Özet',
  decisions: ['Karar'],
  concepts: [],
  questions: [],
  tasks: [{ title: 'Raporu hazırla', type: 'task' as const, assignee: null, due_date: null }],
}

describe('useNoteResult', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    client.query.result = { error: null }
  })

  it('runs the process-note function for the note', async () => {
    client.functions.invoke.mockResolvedValue({ data: {}, error: null })

    await useNoteResult().processNote('note-1')

    expect(client.functions.invoke).toHaveBeenCalledWith('process-note', {
      body: { sourceId: 'note-1' },
    })
  })

  it('passes on the Turkish message the function returned', async () => {
    const context = new Response(
      JSON.stringify({ error: { code: 'ai_unavailable', message: 'AI servisine ulaşılamıyor.' } }),
      { status: 503 },
    )
    client.functions.invoke.mockResolvedValue({ data: null, error: { context } })

    const error = await useNoteResult()
      .processNote('note-1')
      .catch((err: unknown) => err)

    expect(error).toBeInstanceOf(ProcessNoteError)
    expect(error).toMatchObject({ code: 'ai_unavailable', message: 'AI servisine ulaşılamıyor.' })
  })

  it('falls back to a general message when the function cannot be reached', async () => {
    client.functions.invoke.mockResolvedValue({ data: null, error: new Error('fetch failed') })

    await expect(useNoteResult().processNote('note-1')).rejects.toMatchObject({
      code: 'unknown',
      message: expect.stringContaining('notun kaydedildi'),
    })
  })

  it('saves edits and proposed tasks as a draft', async () => {
    await useNoteResult().saveDraft('summary-1', payload)

    expect(client.from).toHaveBeenCalledWith('summaries')
    expect(client.query.update).toHaveBeenCalledWith({
      summary: 'Özet',
      decisions: ['Karar'],
      concepts: [],
      questions: [],
      proposed_tasks: payload.tasks,
    })
    expect(client.query.eq).toHaveBeenCalledWith('id', 'summary-1')
  })

  it('approves the summary and returns how many tasks were added', async () => {
    client.rpc.mockResolvedValue({ data: 1, error: null })

    await expect(useNoteResult().approve('summary-1', payload)).resolves.toBe(1)
    expect(client.rpc).toHaveBeenCalledWith('approve_summary', {
      p_summary_id: 'summary-1',
      p_summary: 'Özet',
      p_decisions: ['Karar'],
      p_concepts: [],
      p_questions: [],
      p_tasks: payload.tasks,
    })
  })

  it('reports an expired session when approving fails with a permission error', async () => {
    client.rpc.mockResolvedValue({ data: null, error: { code: '42501' } })

    await expect(useNoteResult().approve('summary-1', payload)).rejects.toMatchObject({
      code: 'not_signed_in',
    })
  })
})
